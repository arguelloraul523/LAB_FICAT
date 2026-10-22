import bcrypt from 'bcryptjs';
import Cotizacion from '../models/Cotizacion.js';
import HistorialMuestra from '../models/HistorialMuestra.js';
import Muestra from '../models/Muestra.js';
import Solicitud from '../models/Solicitud.js';
import Usuario from '../models/Usuario.js';
import { sanitizarBody } from '../constants/camposPermitidos.js';
import { transicionValida } from '../constants/estados.js';
import { codigoMuestra } from './codigos.service.js';
import { emitir, suscribir } from './eventos.service.js';
import { notificarAvanceMuestra, notificarAsignacionAnalista } from './notificaciones.service.js';
import { esSenaExonerado } from './sena.service.js';
import { ordenarCola, siguienteTurno } from './turnos.service.js';

// ============================================================
// Lógica de negocio de RECEPCIÓN de muestras (RF-09, RF-17, RF-18, RF-19).
//
//   - buscarRecepcion: consulta por código de pre-solicitud y dice si
//     la solicitud es apta para recibir (debe estar "Pagada"; la
//     exonerada ya nace Pagada al aceptar su cotización $0).
//   - crearMuestra: exige el pago (RF-09), limpia el body con la
//     whitelist (regla #12), exige temperatura si el examen la pide,
//     asigna código A1/A2 + turno diario atómico, guarda los exámenes
//     copiados de la cotización y avanza la solicitud a "En proceso".
//   - colaAtencion: muestras del día con ciclo abierto, ordenadas
//     A1 antes que A2 y luego por número de turno (RNF-08).
// ============================================================

const errorCon = (statusCode, mensaje) => {
  const err = new Error(mensaje);
  err.statusCode = statusCode;
  return err;
};

// Campos del catálogo que necesita recepción/rótulo (RF-12, RF-21).
const POBLAR_EXAMEN =
  'nombre cantidadRequerida unidadMedida tipoEnvase temperaturaConservacion tiempoMaxTrasladoHoras requiereTemperatura';

// ===== Búsqueda por código de pre-solicitud (recepción presencial) =====
const buscarRecepcion = async (codigo) => {
  const limpio = String(codigo || '').trim();
  if (!limpio) {
    throw errorCon(400, 'El código de pre-solicitud es obligatorio (p. ej. PRE-2026-0001)');
  }

  const solicitud = await Solicitud.findOne({ codigoPresolicitud: limpio })
    .populate('usuario', 'nombres apellidos correo tipoUsuario')
    .populate('examenes.examen', POBLAR_EXAMEN);
  if (!solicitud) throw errorCon(404, 'Solicitud no encontrada');

  const muestras = await Muestra.find({ solicitud: solicitud._id }).select(
    'codigoMuestra prioridad numeroTurno estado etapaActual fechaIngreso'
  );

  // RF-09: solo una solicitud Pagada (exonerada o con pago aprobado) es apta.
  const apta = solicitud.estado === 'Pagada';
  return {
    aptaRecepcion: apta,
    motivo: apta
      ? null
      : `La solicitud debe estar pagada para recibir la muestra (estado: ${solicitud.estado})`,
    solicitud,
    muestras,
  };
};

// ===== Creación de la muestra en recepción (RF-17, RF-18, RF-19) =====
const crearMuestra = async ({ body = {}, usuario }) => {
  const solicitud = await Solicitud.findById(body.solicitud).populate('usuario');
  if (!solicitud) throw errorCon(404, 'Solicitud no encontrada');

  // Regla inviolable RF-09: sin pago aprobado o exoneración NO se recibe.
  // Una cotización exonerada (SENA verificado) deja la solicitud en "Pagada"
  // al ser aceptada, por eso el mismo control deja pasar al usuario SENA.
  if (solicitud.estado !== 'Pagada') {
    throw errorCon(
      409,
      `La solicitud debe estar pagada para recibir la muestra (estado: ${solicitud.estado})`
    );
  }

  // Regla #12: el body pasa por la whitelist (sin numeroTurno, analista,
  // estado, codigoMuestra... del cliente); el servidor fija lo suyo.
  const datos = sanitizarBody(body);
  const { estadoInicial = 'Aceptada', ...campos } = datos;

  // Estado inicial de recepción (RF-17): Aceptada o En observación.
  if (!['Aceptada', 'En observación'].includes(estadoInicial)) {
    throw errorCon(400, 'El estado inicial debe ser "Aceptada" o "En observación"');
  }

  // Temperatura de recepción obligatoria si algún examen cotizado la exige.
  const cotizacion = await Cotizacion.findOne({ solicitud: solicitud._id })
    .sort({ createdAt: -1 })
    .populate('detalles.examen', 'nombre requiereTemperatura');
  const examenes = (cotizacion?.detalles || []).map((detalle) => detalle.examen).filter(Boolean);
  const exigenFrio = examenes.filter((examen) => examen.requiereTemperatura);
  const sinTemperatura =
    campos.temperaturaRecepcion === undefined ||
    campos.temperaturaRecepcion === null ||
    campos.temperaturaRecepcion === '';
  if (exigenFrio.length && sinTemperatura) {
    const nombres = exigenFrio.map((examen) => examen.nombre).join(', ');
    throw errorCon(
      400,
      `La temperatura de recepción es obligatoria: el(los) análisis ${nombres} requiere(n) conservación en frío`
    );
  }

  // Código A1/A2, prioridad y turno diario atómico (RF-18, RF-19).
  const esSena = await esSenaExonerado(solicitud.usuario);
  const codigo = await codigoMuestra(solicitud.usuario);
  const prioridad = esSena ? 'A1' : 'A2';
  const numeroTurno = await siguienteTurno();

  const muestra = await Muestra.create({
    ...campos,
    solicitud: solicitud._id,
    recepcionista: usuario._id, // lo fija el servidor (regla #12)
    codigoMuestra: codigo,
    prioridad,
    numeroTurno,
    estado: estadoInicial,
    // Lista de análisis copiada de la cotización (snapshot del servidor).
    examenes: examenes.map((examen) => ({ examen: examen._id })),
  });

  await HistorialMuestra.create({
    muestra: muestra._id,
    usuario: usuario._id,
    accion: 'Recepción',
    etapa: 'Recepción',
    valorNuevo: `Turno ${numeroTurno} · ${codigo}`,
  });

  // La solicitud avanza a "En proceso" (transición Pagada → En proceso).
  solicitud.estado = 'En proceso';
  await solicitud.save();

  return muestra;
};

// ===== Cola de atención del día (RF-19, RNF-08) =====
const colaAtencion = async (fechaParametro) => {
  let fecha;
  if (fechaParametro) {
    fecha = new Date(`${String(fechaParametro).slice(0, 10)}T00:00:00`);
    if (Number.isNaN(fecha.getTime())) {
      throw errorCon(400, 'La fecha debe tener formato YYYY-MM-DD');
    }
  } else {
    fecha = new Date();
  }

  const desde = new Date(fecha);
  desde.setHours(0, 0, 0, 0);
  const hasta = new Date(fecha);
  hasta.setHours(23, 59, 59, 999);

  const data = await Muestra.find({
    fechaIngreso: { $gte: desde, $lte: hasta },
    estado: { $ne: 'Rechazada' }, // el rechazo cancela el ciclo (RF-20)
    etapaActual: { $nin: ['Finalizada', 'Cancelada'] },
  })
    .select('codigoMuestra prioridad numeroTurno estado etapaActual fechaIngreso solicitud')
    .populate('solicitud', 'codigoPresolicitud')
    .sort({ prioridad: 1, numeroTurno: 1 });

  const cola = ordenarCola(data); // A1 antes que A2, luego por llegada
  const fechaTexto = `${desde.getFullYear()}-${String(desde.getMonth() + 1).padStart(2, '0')}-${String(
    desde.getDate()
  ).padStart(2, '0')}`;

  return {
    fecha: fechaTexto,
    enAtencion: cola[0] || null,
    total: cola.length,
    data: cola,
  };
};

// ============================================================
// Fase 6: etapas, asignación, reapertura y des-anonimización.
// ============================================================

// Hitos de etapa que notifican al cliente (Fase 6).
const HITOS_NOTIFICACION = new Set(['Resultados', 'Validación', 'Finalizada', 'Re-ensayo']);

// Suscripción de las notificaciones a los eventos (una sola vez).
suscribir('muestraAvance', notificarAvanceMuestra);
suscribir('analistaAsignado', notificarAsignacionAnalista);

// ===== Cambio de etapa (RF-23, RF-24) =====
// Valida la transición, exige justificación al pasar a Re-ensayo (RF-23),
// registra en el historial (append-only) y notifica al cliente en hitos.
const cambiarEtapaMuestra = async ({ id, etapaActual, justificacion, usuario }) => {
  const muestra = await Muestra.findById(id).populate({
    path: 'solicitud',
    select: 'usuario codigoPresolicitud',
  });
  if (!muestra) throw errorCon(404, 'Registro no encontrado');

  if (!transicionValida('etapa', muestra.etapaActual, etapaActual)) {
    throw errorCon(409, `Transición inválida de "etapaActual": ${muestra.etapaActual} → ${etapaActual}`);
  }

  // Regla inviolable #8: Re-ensayo exige justificación (RF-23).
  const justif = String(justificacion || '').trim();
  if (etapaActual === 'Re-ensayo' && !justif) {
    throw errorCon(400, 'La justificación es obligatoria al pasar a Re-ensayo (RF-23)');
  }

  const etapaAnterior = muestra.etapaActual;
  muestra.etapaActual = etapaActual;
  await muestra.save();

  await HistorialMuestra.create({
    muestra: muestra._id,
    usuario: usuario._id,
    accion: 'Cambio de etapa',
    etapa: etapaActual,
    valorAnterior: etapaAnterior,
    valorNuevo: etapaActual,
    ...(justif ? { comentario: justif } : {}),
  });

  // Hitos: notificación al cliente (el evento nunca rompe la respuesta).
  if (HITOS_NOTIFICACION.has(etapaActual)) {
    await emitir('muestraAvance', {
      muestra,
      solicitud: muestra.solicitud,
      etapa: etapaActual,
      porcentajeAvance: muestra.porcentajeAvance,
    });
  }

  return muestra;
};

// ===== Asignación / reasignación de analista (RF-28, solo Administrador) =====
const asignarAnalista = async ({ id, analistaId, accion, motivo, usuario }) => {
  const muestra = await Muestra.findById(id);
  if (!muestra) throw errorCon(404, 'Registro no encontrado');

  const justif = String(motivo || '').trim();
  if (!justif) throw errorCon(400, 'El motivo es obligatorio (RF-28)');

  const analista = await Usuario.findById(analistaId)
    .select('nombres apellidos correo rol roles activo')
    .populate('rol', 'nombre')
    .populate('roles', 'nombre');
  if (!analista || !analista.activo) {
    throw errorCon(404, 'Analista no encontrado o inactivo');
  }
  const tieneRol =
    analista.rol?.nombre === 'Analista' ||
    (analista.roles || []).some((rol) => rol?.nombre === 'Analista');
  if (!tieneRol) throw errorCon(400, 'El usuario indicado no tiene el rol Analista');

  const anterior = muestra.analista;
  if (accion === 'Asignar' && anterior) {
    throw errorCon(409, 'La muestra ya tiene analista asignado: use "Reasignar"');
  }
  if (accion === 'Reasignar' && !anterior) {
    throw errorCon(409, 'La muestra aún no tiene analista: use "Asignar"');
  }

  muestra.analista = analista._id;
  await muestra.save();

  await HistorialMuestra.create({
    muestra: muestra._id,
    usuario: usuario._id,
    accion: accion === 'Reasignar' ? 'Reasignación' : 'Asignación',
    etapa: muestra.etapaActual,
    valorAnterior: anterior ? String(anterior) : null,
    valorNuevo: String(analista._id),
    comentario: justif,
  });

  await emitir('analistaAsignado', { analista, muestra, accion, motivo: justif });

  return muestra.populate('analista', 'nombres apellidos correo');
};

// ===== Reapertura de una muestra Finalizada (RF-28, solo Administrador) =====
const ETAPAS_DESTINO_REAPERTURA = ['Resultados', 'Validación', 'Re-ensayo'];

const reabrirMuestra = async ({ id, etapaDestino, motivo, usuario }) => {
  const muestra = await Muestra.findById(id).populate({
    path: 'solicitud',
    select: 'usuario codigoPresolicitud',
  });
  if (!muestra) throw errorCon(404, 'Registro no encontrado');

  // Solo se reabre una muestra Finalizada (decisión del usuario).
  if (muestra.etapaActual !== 'Finalizada') {
    throw errorCon(
      409,
      `Solo se puede reabrir una muestra "Finalizada" (estado actual: ${muestra.etapaActual})`
    );
  }

  const justif = String(motivo || '').trim();
  if (!justif) throw errorCon(400, 'El motivo es obligatorio (RF-28)');

  const destino = ETAPAS_DESTINO_REAPERTURA.includes(etapaDestino) ? etapaDestino : 'Validación';
  const etapaAnterior = muestra.etapaActual;
  muestra.etapaActual = destino;
  await muestra.save();

  await HistorialMuestra.create({
    muestra: muestra._id,
    usuario: usuario._id,
    accion: 'Reapertura',
    etapa: destino,
    valorAnterior: etapaAnterior,
    valorNuevo: destino,
    comentario: justif,
  });

  // Avisa al analista asignado (si lo hay) y al cliente (cambio de hito).
  if (muestra.analista) {
    await emitir('analistaAsignado', {
      analista: muestra.analista,
      muestra,
      accion: 'Reapertura',
      motivo: justif,
    });
  }
  await emitir('muestraAvance', {
    muestra,
    solicitud: muestra.solicitud,
    etapa: destino,
    porcentajeAvance: muestra.porcentajeAvance,
  });

  return muestra;
};

// ===== Des-anonimización (RF-29): contraseña + motivo auditado =====
// Devuelve los datos del cliente de la muestra. Reautentica con la
// contraseña del usuario activo y registra "Consulta datos cliente".
const datosCliente = async ({ id, contrasena, motivo, usuario }) => {
  const justif = String(motivo || '').trim();
  if (!justif) throw errorCon(400, 'El motivo es obligatorio (RF-29)');
  if (!contrasena) throw errorCon(400, 'La contraseña es obligatoria (RF-29)');

  const enBD = await Usuario.findById(usuario._id).select('+contrasenaHash');
  const valida = await bcrypt.compare(String(contrasena), enBD?.contrasenaHash || '');
  if (!valida) throw errorCon(401, 'Contraseña incorrecta');

  const muestra = await Muestra.findById(id).populate({
    path: 'solicitud',
    populate: { path: 'usuario', select: 'nombres apellidos correo tipoDocumento numeroDocumento telefono' },
  });
  if (!muestra) throw errorCon(404, 'Registro no encontrado');

  const cliente = muestra.solicitud?.usuario;
  if (!cliente || typeof cliente !== 'object') {
    throw errorCon(404, 'La muestra no tiene cliente asociado');
  }

  // Auditoría RF-29 (regla #6): quién, cuándo y por qué.
  await HistorialMuestra.create({
    muestra: muestra._id,
    usuario: usuario._id,
    accion: 'Consulta datos cliente',
    etapa: muestra.etapaActual,
    valorNuevo: 'Datos de cliente consultados',
    comentario: justif,
  });

  return {
    codigoPresolicitud: muestra.solicitud?.codigoPresolicitud || null,
    codigoMuestra: muestra.codigoMuestra || null,
    cliente: {
      nombres: cliente.nombres,
      apellidos: cliente.apellidos,
      correo: cliente.correo,
      tipoDocumento: cliente.tipoDocumento,
      numeroDocumento: cliente.numeroDocumento,
      telefono: cliente.telefono || null,
    },
  };
};

export {
  buscarRecepcion,
  crearMuestra,
  colaAtencion,
  cambiarEtapaMuestra,
  asignarAnalista,
  reabrirMuestra,
  datosCliente,
  POBLAR_EXAMEN,
  HITOS_NOTIFICACION,
  ETAPAS_DESTINO_REAPERTURA,
};
