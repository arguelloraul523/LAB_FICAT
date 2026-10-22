// ============================================================
// Verificación de recepción, turnos, rechazo y rótulos (RF-17…RF-21).
// SIN conectar a MongoDB.
// Uso:  node verificacion/recepcion-turnos-rechazos.js   (sale con código 1 si algo falla)
// No forma parte de la aplicación; replica las reglas con dobles en
// memoria. Los casos HTTP están en API_TEST.http (47-52).
// Criterios del usuario:
//   - la cola devuelve A1 primero (y luego por llegada/turno),
//   - el rechazo no se puede hacer sin motivo.
// ============================================================
import { validationResult } from 'express-validator';
import { validarBuscarMuestra, validarCrearMuestra } from '../src/validators/muestra.validators.js';
import { validarCrearRechazo, validarDecidirRechazo } from '../src/validators/rechazo.validators.js';
import { transicionValida } from '../src/constants/estados.js';
import { claveDeFecha, siguienteTurno, ordenarCola } from '../src/services/turnos.service.js';
import { buscarRecepcion, crearMuestra, colaAtencion } from '../src/services/muestras.service.js';
import { crearRechazo, decidirRechazo } from '../src/services/rechazos.service.js';
import { htmlRotulo } from '../src/services/rotulo.service.js';
import Contador from '../src/models/Contador.js';
import Cotizacion from '../src/models/Cotizacion.js';
import HistorialMuestra from '../src/models/HistorialMuestra.js';
import MotivoRechazo from '../src/models/MotivoRechazo.js';
import Muestra from '../src/models/Muestra.js';
import Notificacion from '../src/models/Notificacion.js';
import Rechazo from '../src/models/Rechazo.js';
import Solicitud from '../src/models/Solicitud.js';
import Usuario from '../src/models/Usuario.js';

let total = 0;
let fallos = 0;
const ok = (c, m) => { total++; if (c) console.log('ok: ' + m); else { fallos++; console.log('FALLO: ' + m); } };
const correr = async (cadena, body, query = {}) => {
  const req = { body, query };
  for (const c of cadena) await c.run(req);
  return validationResult(req);
};

(async () => {
  // ---- Dobles de BD (nada toca MongoDB) ----
  const secuencias = new Map();
  Contador.findOneAndUpdate = async (filtro) => {
    const id = filtro._id;
    const n = (secuencias.get(id) || 0) + 1;
    secuencias.set(id, n);
    return { _id: id, secuencia: n };
  };

  const historialCreado = [];
  HistorialMuestra.create = async (d) => { historialCreado.push(d); return d; };
  const notificaciones = [];
  Notificacion.create = async (d) => { notificaciones.push(d); return d; };
  Usuario.findById = () => ({ select: async () => ({ _id: 'u1', correo: 'ana@x.com', nombres: 'Ana' }) });

  // ---- 1) Turnos (6) ----
  ok(claveDeFecha(new Date(2026, 9, 9)) === 'TURNO-2026-10-09', 'clave de turno diaria TURNO-AAAA-MM-DD');
  const hoy = await siguienteTurno();
  const t2 = await siguienteTurno();
  const t3 = await siguienteTurno();
  ok(hoy === 1 && t2 === 2 && t3 === 3, 'turnos consecutivos 1, 2, 3 (secuencia atomica)');
  ok((await siguienteTurno(new Date(2026, 9, 10))) === 1, 'otro dia arranca otra serie en 1');
  const desorden = [
    { prioridad: 'A2', numeroTurno: 1 },
    { prioridad: 'A1', numeroTurno: 5 },
    { prioridad: 'A1', numeroTurno: 2 },
    { prioridad: 'A2', numeroTurno: 4 },
  ];
  const ordenada = ordenarCola(desorden);
  ok(
    ordenada.map((m) => `${m.prioridad}${m.numeroTurno}`).join(',') === 'A12,A15,A21,A24',
    'ordenarCola: A1 antes que A2 y luego por llegada'
  );
  ok(ordenada[0] === ordenada[0] && desorden[0].prioridad === 'A2', 'ordenarCola no muta la entrada');

  // ---- 2) Cola del dia (4) ----
  Muestra.find = () => ({ select: () => ({ populate: () => ({ sort: () => desorden }) }) });
  const cola = await colaAtencion();
  ok(cola.total === 4, 'cola: total del dia');
  ok(cola.enAtencion.prioridad === 'A1' && cola.enAtencion.numeroTurno === 2, 'cola: en atencion es el primer A1');
  ok(/^\d{4}-\d{2}-\d{2}$/.test(cola.fecha), 'cola: fecha YYYY-MM-DD');
  try { await colaAtencion('ayer'); ok(false, 'cola: fecha invalida -> 400'); }
  catch (e) { ok(e.statusCode === 400, 'cola: fecha invalida -> 400'); }

  // ---- 3) Maquina de estados (5) ----
  ok(transicionValida('muestra', 'Aceptada', 'Rechazada'), 'muestra Aceptada -> Rechazada (RF-20)');
  ok(transicionValida('muestra', 'Recibida', 'Rechazada'), 'muestra Recibida -> Rechazada');
  ok(transicionValida('muestra', 'En observación', 'Rechazada'), 'muestra En observación -> Rechazada');
  ok(!transicionValida('muestra', 'Rechazada', 'Aceptada'), 'muestra Rechazada es terminal');
  ok(!transicionValida('etapa', 'Cancelada', 'Análisis'), 'etapa Cancelada es terminal');

  // ---- 4) Busqueda en recepcion (5) ----
  Solicitud.findOne = () => ({ populate: () => ({ populate: () => solicitudBuscada }) });
  let solicitudBuscada = null;
  Muestra.find = () => ({ select: () => [] });
  try { await buscarRecepcion(''); ok(false, 'buscar sin codigo -> 400'); }
  catch (e) { ok(e.statusCode === 400, 'buscar sin codigo -> 400'); }
  try { await buscarRecepcion('PRE-2026-9999'); ok(false, 'buscar inexistente -> 404'); }
  catch (e) { ok(e.statusCode === 404, 'buscar inexistente -> 404'); }
  solicitudBuscada = { _id: 's2', codigoPresolicitud: 'PRE-2026-0002', estado: 'Pendiente de pago', usuario: { _id: 'u2' } };
  let r = await buscarRecepcion('PRE-2026-0002');
  ok(r.aptaRecepcion === false && /pagada/.test(r.motivo), 'buscar: no pagada -> no apta con motivo');
  solicitudBuscada.estado = 'Pagada';
  r = await buscarRecepcion('PRE-2026-0002');
  ok(r.aptaRecepcion === true && r.motivo === null, 'buscar: pagada -> aptaRecepcion true');

  // ---- 5) Validadores de recepcion (5) ----
  const muestraBase = {
    solicitud: '507f1f77bcf86cd799439011',
    entregadoPor: 'Carlos Gomez',
    fechaHoraEntrega: new Date().toISOString(),
    cantidadRecibida: 500,
    unidadMedida: 'mL',
    estadoEmpaque: 'Buen estado',
  };
  r = await correr(validarCrearMuestra, muestraBase);
  ok(r.isEmpty(), 'validar crear muestra: payload valido pasa');
  r = await correr(validarCrearMuestra, { solicitud: 'x' });
  ok(r.array().length >= 4, 'validar crear muestra: faltan datos -> 4+ errores');
  r = await correr(validarCrearMuestra, { ...muestraBase, estadoInicial: 'Recibida' });
  ok(!r.isEmpty(), 'validar crear muestra: estadoInicial "Recibida" rechazado');
  r = await correr(validarBuscarMuestra, {});
  ok(!r.isEmpty(), 'validar buscar: sin ?codigo -> 400');
  r = await correr(validarCrearRechazo, {});
  ok(r.array().length >= 2, 'validar rechazo: sin muestra ni motivo -> 2+ errores');

  // ---- 6) crearMuestra (13) ----
  let solicitudActual = null;
  let cotizacionDetalles = [];
  Solicitud.findById = () => ({ populate: () => solicitudActual });
  Cotizacion.findOne = () => ({ sort: () => ({ populate: () => ({ detalles: cotizacionDetalles }) }) });
  const muestrasCreadas = [];
  Muestra.create = async (d) => { muestrasCreadas.push(d); return { _id: 'm' + muestrasCreadas.length, ...d, save: async () => {} }; };
  const nuevaSolicitud = (estado, usuario) => ({
    _id: 's1', estado, usuario, guardada: false,
    save: async function () { this.guardada = true; },
  });

  solicitudActual = null;
  try { await crearMuestra({ body: { solicitud: 'x' }, usuario: { _id: 'u9' } }); ok(false, 'crear: solicitud inexistente -> 404'); }
  catch (e) { ok(e.statusCode === 404, 'crear: solicitud inexistente -> 404'); }

  solicitudActual = nuevaSolicitud('Pendiente de pago', { _id: 'u1', tipoUsuario: 'SENA' });
  try { await crearMuestra({ body: { solicitud: 's1' }, usuario: { _id: 'u9' } }); ok(false, 'crear: sin pago -> 409 (RF-09)'); }
  catch (e) { ok(e.statusCode === 409 && /pagada/.test(e.message), 'crear: sin pago -> 409 (RF-09)'); }

  solicitudActual = nuevaSolicitud('Pagada', { _id: 'u1', tipoUsuario: 'SENA' });
  cotizacionDetalles = [{ examen: { _id: 'e1', nombre: 'Sulfato', requiereTemperatura: false } }];
  const turnoEsperado = (secuencias.get(claveDeFecha()) || 0) + 1;
  const creada = await crearMuestra({
    body: { ...muestraBase, numeroTurno: 99, analista: 'x', estado: 'Rechazada', codigoMuestra: 'HACK', prioridad: 'A2', recepcionista: 'otro' },
    usuario: { _id: 'u9' },
  });
  ok(creada.numeroTurno === turnoEsperado && creada.codigoMuestra.startsWith('A1-'), 'crear: turno y codigo los fija el servidor');
  ok(creada.estado === 'Aceptada' && creada.prioridad === 'A1', 'crear: estado inicial Aceptada y prioridad A1 (SENA)');
  ok(creada.recepcionista === 'u9' && creada.analista === undefined, 'crear: recepcionista forzado y analista descartado');
  ok(creada.examenes.length === 1 && String(creada.examenes[0].examen) === 'e1', 'crear: examenes copiados de la cotizacion');
  ok(solicitudActual.estado === 'En proceso' && solicitudActual.guardada === true, 'crear: solicitud avanza a En proceso');
  ok(historialCreado.some((h) => h.accion === 'Recepción' && h.etapa === 'Recepción'), 'crear: historial con accion Recepción');

  solicitudActual = nuevaSolicitud('Pagada', { _id: 'cli', tipoUsuario: 'EXTERNO' });
  const enObservacion = await crearMuestra({ body: { ...muestraBase, estadoInicial: 'En observación' }, usuario: { _id: 'u9' } });
  ok(enObservacion.estado === 'En observación' && enObservacion.prioridad === 'A2', 'crear: estadoInicial En observación y A2 (externo)');

  solicitudActual = nuevaSolicitud('Pagada', { _id: 'cli', tipoUsuario: 'EXTERNO' });
  try { await crearMuestra({ body: { ...muestraBase, estadoInicial: 'Recibida' }, usuario: { _id: 'u9' } }); ok(false, 'crear: estadoInicial invalido -> 400'); }
  catch (e) { ok(e.statusCode === 400, 'crear: estadoInicial invalido -> 400'); }

  solicitudActual = nuevaSolicitud('Pagada', { _id: 'cli', tipoUsuario: 'EXTERNO' });
  cotizacionDetalles = [{ examen: { _id: 'e2', nombre: 'Hemograma', requiereTemperatura: true } }];
  try { await crearMuestra({ body: muestraBase, usuario: { _id: 'u9' } }); ok(false, 'crear: temperatura obligatoria si el examen la exige -> 400'); }
  catch (e) { ok(e.statusCode === 400 && /temperatura/i.test(e.message), 'crear: temperatura obligatoria si el examen la exige -> 400'); }
  const conTemperatura = await crearMuestra({ body: { ...muestraBase, temperaturaRecepcion: 4 }, usuario: { _id: 'u9' } });
  ok(conTemperatura.temperaturaRecepcion === 4, 'crear: con temperatura la recepcion pasa');

  // ---- 7) Rechazo (12) ----
  let muestraRechazo = null;
  let motivoResultado = null;
  Muestra.findById = () => ({ populate: () => muestraRechazo });
  MotivoRechazo.findById = async () => motivoResultado;
  const rechazosCreados = [];
  Rechazo.create = async (d) => { rechazosCreados.push(d); return { _id: 'r' + rechazosCreados.length, ...d, save: async function () {} }; };
  const nuevaMuestraRechazo = (estado) => ({
    _id: 'm9',
    codigoMuestra: 'A2-2026-0007',
    prioridad: 'A2',
    numeroTurno: 7,
    estado,
    etapaActual: 'Recepción',
    observaciones: null,
    solicitud: { _id: 's9', codigoPresolicitud: 'PRE-2026-0009', usuario: { _id: 'cliente1', nombres: 'Ana', apellidos: 'Perez', correo: 'ana@x.com' } },
    save: async function () { this.guardada = true; },
  });
  const acta = async () => 'acta-fake.pdf';

  muestraRechazo = null;
  try { await crearRechazo({ body: { muestra: 'x', motivo: 'y' }, usuario: { _id: 'u9' }, generarActa: acta }); ok(false, 'rechazo: muestra inexistente -> 404'); }
  catch (e) { ok(e.statusCode === 404, 'rechazo: muestra inexistente -> 404'); }

  muestraRechazo = nuevaMuestraRechazo('Aceptada');
  motivoResultado = null;
  notificaciones.length = 0;
  try { await crearRechazo({ body: { muestra: 'm9' }, usuario: { _id: 'u9' }, generarActa: acta }); ok(false, 'rechazo: SIN MOTIVO -> 400 (criterio)'); }
  catch (e) { ok(e.statusCode === 400 && /motivo/i.test(e.message), 'rechazo: SIN MOTIVO -> 400 (criterio)'); }
  ok(notificaciones.length === 0, 'rechazo: sin motivo no se notifica nada');

  muestraRechazo = nuevaMuestraRechazo('Rechazada');
  motivoResultado = { _id: 'mr1', nombre: 'Volumen insuficiente' };
  try { await crearRechazo({ body: { muestra: 'm9', motivo: 'mr1' }, usuario: { _id: 'u9' }, generarActa: acta }); ok(false, 'rechazo: muestra ya rechazada -> 409'); }
  catch (e) { ok(e.statusCode === 409, 'rechazo: muestra ya rechazada -> 409'); }

  muestraRechazo = nuevaMuestraRechazo('Aceptada');
  notificaciones.length = 0;
  const { rechazo, muestra } = await crearRechazo({
    body: { muestra: 'm9', motivo: 'mr1', observaciones: 'Llegó con menos de 20 mL' },
    evidenciaFoto: 'evidencia-1.png',
    usuario: { _id: 'u9' },
    generarActa: acta,
  });
  ok(rechazo.actaPdf === 'acta-fake.pdf' && rechazo.decisionCliente == null, 'rechazo: acta del servidor y decision nula (modelo aplica Pendiente)');
  ok(rechazo.evidenciaFoto === 'evidencia-1.png' && rechazo.observaciones === 'Llegó con menos de 20 mL', 'rechazo: evidencia opcional y observaciones');
  ok(muestra.estado === 'Rechazada' && muestra.etapaActual === 'Cancelada' && muestra.guardada === true, 'rechazo: muestra Rechazada + ciclo Cancelada');
  ok(historialCreado.some((h) => h.accion === 'Rechazo' && h.etapa === 'Cancelada' && /Volumen insuficiente/.test(h.valorNuevo)), 'rechazo: historial con accion Rechazo');
  ok(notificaciones.length === 1 && /Muestra rechazada/.test(notificaciones[0].asunto), 'rechazo: notificacion al cliente emitida');
  ok(/Reenviar/.test(notificaciones[0].contenido) && /Recoger/.test(notificaciones[0].contenido), 'rechazo: la notificacion pide decision Reenviar/Recoger');

  // ---- 8) Decision del cliente (5) ----
  let rechazoDueno = null;
  Rechazo.findById = () => ({ populate: () => rechazoDueno });
  rechazoDueno = { decisionCliente: 'Pendiente', muestra: { solicitud: { usuario: 'cliente1' } }, save: async function () {} };
  const decidida = await decidirRechazo({ id: 'r1', decision: 'Recoger', usuario: { _id: 'cliente1' }, esCliente: true });
  ok(decidida.decisionCliente === 'Recoger', 'decision: cliente dueño elige Recoger');
  try { await decidirRechazo({ id: 'r1', decision: 'Reenviar', usuario: { _id: 'otro' }, esCliente: true }); ok(false, 'decision: cliente ajeno -> 403'); }
  catch (e) { ok(e.statusCode === 403, 'decision: cliente ajeno -> 403'); }
  const personal = await decidirRechazo({ id: 'r1', decision: 'Reenviar', usuario: { _id: 'u9' }, esCliente: false });
  ok(personal.decisionCliente === 'Reenviar', 'decision: recepcionista registra Reenviar');
  try { await decidirRechazo({ id: 'r1', decision: 'Volver', usuario: { _id: 'u9' }, esCliente: false }); ok(false, 'decision: valor invalido -> 400'); }
  catch (e) { ok(e.statusCode === 400, 'decision: valor invalido -> 400'); }
  r = await correr(validarDecidirRechazo, { decision: 'Reenviar' });
  ok(r.isEmpty(), 'validar decision: Reenviar pasa');

  // ---- 9) Rotulo 58/80 mm sin datos del cliente (6) ----
  const muestraRotulo = {
    codigoMuestra: 'A1-2026-0003',
    prioridad: 'A1',
    numeroTurno: 3,
    fechaIngreso: new Date('2026-10-09T10:00:00'),
    examenes: [{ examen: { nombre: 'Sulfato', cantidadRequerida: 250, unidadMedida: 'mL', tipoEnvase: 'Frasco de vidrio', temperaturaConservacion: '2-8 C', tiempoMaxTrasladoHoras: 6 } }],
    solicitud: { usuario: { nombres: 'Ana', apellidos: 'Perez', correo: 'ana@x.com', documento: '1018765432' } },
  };
  const html58 = htmlRotulo({ muestra: muestraRotulo, ancho: '58' });
  ok(html58.includes('A1-2026-0003') && html58.includes('Turno 3') && html58.includes('58mm'), 'rotulo 58mm: codigo, turno y ancho');
  ok(html58.includes('Sulfato') && html58.includes('Frasco de vidrio') && html58.includes('2-8 C') && html58.includes('6 h'), 'rotulo: parametros del examen');
  ok(!html58.includes('Ana') && !html58.includes('ana@x.com') && !html58.includes('1018765432'), 'rotulo: SIN datos del cliente (RF-22)');
  const html80 = htmlRotulo({ muestra: muestraRotulo, ancho: '80' });
  ok(html80.includes('80mm'), 'rotulo 80mm');
  ok(htmlRotulo({ muestra: { codigoMuestra: '<script>alert(1)</script>', examenes: [] }, ancho: '58' }).includes('&lt;script&gt;'), 'rotulo: HTML escapado (sin inyeccion)');
  ok(/^\d{4}-\d{2}-\d{2}$/.test(claveDeFecha(new Date(2026, 9, 9)).replace('TURNO-', '')), 'claveDeFecha usa formato fecha completo');

  // ------------------------------------------------------------
  console.log(`\nRecepción/turnos/rechazos: ${total} aserciones, ${fallos} fallo(s)`);
  process.exit(fallos ? 1 : 0);
})().catch((e) => {
  console.error('Error inesperado en la suite:', e);
  process.exit(1);
});
