import Notificacion from '../models/Notificacion.js';
import PlantillaMensaje from '../models/PlantillaMensaje.js';
import Usuario from '../models/Usuario.js';
import mongoose from 'mongoose';
import { renderPlantilla } from './plantillas.service.js';
import { encolarCorreo } from './colaNotificaciones.service.js';

// ============================================================
// Servicio ÚNICO de notificación (RF-14, RNF-09).
// Cada evento del dominio se envía con una plantilla (por `codigo`) y
// variables. La plantilla se lee de la BD en CADA envío (sin caché), de
// modo que editarla cambia el siguiente mensaje sin reiniciar.
//
// Canales: App (registro inmediato) y Correo (asíncrono, con reintentos
// y registro del resultado en la Notificacion).
// ============================================================

// Instrucciones de muestra desde los exámenes de la cotización (snapshot, RF-12).
const instruccionesDeMuestra = (cotizacion) =>
  (cotizacion?.detalles || [])
    .map((detalle) => {
      const examen = detalle.examen;
      if (!examen) return null; // examen eliminado del catálogo
      return {
        examen: examen.nombre,
        muestrasSolicitadas: detalle.cantidadMuestras,
        cantidad: `${examen.cantidadRequerida} ${examen.unidadMedida}`,
        envase: examen.tipoEnvase,
        temperatura: examen.temperaturaConservacion || 'Ambiente',
        tiempoMaxTrasladoHoras:
          typeof examen.tiempoMaxTrasladoHoras === 'number' ? examen.tiempoMaxTrasladoHoras : null,
      };
    })
    .filter(Boolean);

// Texto plano de las instrucciones (variable {{instrucciones}}).
const textoInstrucciones = (instrucciones) =>
  instrucciones
    .map(
      (i, n) =>
        `${n + 1}. ${i.examen}\n` +
        `   Cantidad: ${i.cantidad} (${i.muestrasSolicitadas} muestra(s))\n` +
        `   Envase: ${i.envase}\n` +
        `   Temperatura de conservación: ${i.temperatura}\n` +
        `   Tiempo máximo de traslado: ${
          i.tiempoMaxTrasladoHoras === null ? 'No aplica' : `${i.tiempoMaxTrasladoHoras} hora(s)`
        }`
    )
    .join('\n\n');

// Carga el dueño de la solicitud (acepta `usuario` como id o ya poblado).
const duenioDe = async (solicitud) => {
  const id = solicitud?.usuario?._id || solicitud?.usuario;
  if (!id) return null;
  return Usuario.findById(id).select('nombres correo');
};

const idDe = (doc) => {
  if (!doc) return null;
  if (doc._id) return doc._id;
  // Un objeto sin `_id` no es un identificador (p. ej. la plantilla de respaldo).
  if (typeof doc === 'object') return null;
  return doc;
};

// ===== Plantillas =====
// Fuente prioritaria: la BD (editable). Cuando no hay conexión (pruebas
// offline) se usa un texto de respaldo por canal App para no romper el flujo.
let buscarPlantilla = async (codigo) => {
  if (mongoose.connection.readyState !== 1) return null;
  return PlantillaMensaje.findOne({ codigo });
};

const PLANTILLAS_FALLBACK = {
  'pago-aprobado': {
    canal: 'App',
    asunto: 'Pago aprobado - instrucciones de muestra',
    cuerpo:
      'Tu pago fue verificado y aprobado. Tu solicitud {{orden}} ya está registrada como pagada; ' +
      'puedes acercarte a recepción para entregar tu muestra.\n\n' +
      'INSTRUCCIONES DE MUESTRA\n{{instrucciones}}',
  },
  'pago-rechazado': {
    canal: 'App',
    asunto: 'Pago rechazado',
    cuerpo:
      'Tu pago fue rechazado en la verificación manual.\n\nMotivo: {{motivo}}\n\n' +
      'Puedes reportar un nuevo comprobante desde "Mis pagos".',
  },
  'muestra-rechazada': {
    canal: 'App',
    asunto: 'Muestra rechazada - decide Reenviar o Recoger',
    cuerpo:
      'Tu muestra {{codigoMuestra}} fue rechazada en recepción del laboratorio.\n\n' +
      'Motivo: {{motivo}}\nActa de rechazo: {{actaPdf}}\n\n' +
      'Responde a recepción con tu decisión:\n' +
      '• Reenviar: entregas una nueva muestra para el mismo análisis.\n' +
      '• Recoger: recoges la muestra rechazada en el laboratorio.',
  },
  'muestra-avance': {
    canal: 'App',
    asunto: 'Muestra {{codigoMuestra}} - etapa {{estado}}',
    cuerpo:
      'Tu muestra {{codigoMuestra}} avanzó a la etapa "{{estado}}" (avance {{porcentajeAvance}}% ' +
      'del proceso técnico). Te avisaremos cuando el informe esté disponible.',
  },
  'analista-asignado': {
    canal: 'App',
    asunto: 'Muestra asignada: {{codigoMuestra}}',
    cuerpo:
      '{{verbo}} la muestra {{codigoMuestra}} (prioridad {{prioridad}}, turno {{turno}}).\n' +
      'Etapa actual: {{estado}}\nMotivo: {{motivo}}',
  },
  'solicitud-cerrada': {
    canal: 'App',
    asunto: 'Solicitud {{orden}} cerrada',
    cuerpo:
      'Tu solicitud {{orden}} quedó cerrada: el informe de resultados fue aprobado y tu encuesta ' +
      'de satisfacción quedó registrada.\n\nYa puedes descargar el informe desde la plataforma.',
  },
  'pqr-actualizada': {
    canal: 'App',
    asunto: 'PQR {{tipo}} - estado {{estado}}',
    cuerpo: 'Tu {{tipo}} cambió al estado "{{estado}}".\n\n{{respuesta}}',
  },
  'alerta-retraso-muestra': {
    canal: 'Correo',
    asunto: 'Alerta de retraso - muestra {{codigoMuestra}}',
    cuerpo:
      'La muestra {{codigoMuestra}} (solicitud {{orden}}) lleva más de {{dias}} días sin avance. ' +
      'Etapa actual: {{estado}}.',
  },
  'alerta-retraso-cupon': {
    canal: 'Correo',
    asunto: 'Alerta de retraso - cupón {{codigoReferencia}}',
    cuerpo:
      'El cupón {{codigoReferencia}} (solicitud {{orden}}) lleva más de {{dias}} días sin pago registrado.',
  },
  'verificacion-aprobada': {
    canal: 'Ambos',
    asunto: 'Verificación SENA aprobada',
    cuerpo:
      'Hola {{nombre}}, tu verificación como miembro SENA fue aprobada. Ya puedes solicitar ' +
      'análisis con la tarifa exonerada ($0) y prioridad A1.',
  },
  'verificacion-rechazada': {
    canal: 'Ambos',
    asunto: 'Verificación SENA rechazada',
    cuerpo:
      'Hola {{nombre}}, tu solicitud de verificación SENA fue rechazada. Revisa que tu correo ' +
      'institucional (@sena.edu.co) y tu soporte (carné o certificado) estén correctos y vuelve a intentarlo.',
  },
};

// Inyección de la búsqueda de plantilla (pruebas o configuración avanzada).
const configurarNotificaciones = ({ buscarPlantilla: fn } = {}) => {
  if (typeof fn === 'function') buscarPlantilla = fn;
};

// Resuelve la plantilla: BD (si hay conexión) o respaldo por codigo.
const resolverPlantilla = async (codigo) => {
  const clave = String(codigo).toLowerCase();
  const deBD = await buscarPlantilla(clave);
  if (deBD) return deBD;
  return PLANTILLAS_FALLBACK[clave] || null;
};

// ===== Servicio único =====
// Busca la plantilla por `codigo`, renderiza con las variables y envía:
//  - App: registro inmediato (estado Enviado).
//  - Correo: registro Pendiente + encolado asíncrono con reintentos.
const notificar = async ({ codigo, usuario, solicitud, variables = {} }) => {
  if (!usuario) return null;

  // Sin caché: se resuelve la plantilla vigente en cada envío (RF-14).
  const plantilla = await resolverPlantilla(codigo);
  if (!plantilla) {
    console.error(`⚠️  Plantilla "${codigo}" no encontrada: no se envió la notificación`);
    return null;
  }

  const vars = { nombre: usuario.nombres || '', ...variables };
  const asunto = renderPlantilla(plantilla.asunto, vars);
  const contenido = renderPlantilla(plantilla.cuerpo, vars);
  const base = {
    usuario: idDe(usuario),
    plantilla: idDe(plantilla),
    solicitud: idDe(solicitud),
    asunto,
    contenido,
  };

  let app = null;
  if (plantilla.canal === 'App' || plantilla.canal === 'Ambos') {
    app = await Notificacion.create({
      ...base,
      canal: 'App',
      estado: 'Enviado',
      intentos: 1,
      fechaEnvio: new Date(),
    });
  }

  let correo = null;
  if ((plantilla.canal === 'Correo' || plantilla.canal === 'Ambos') && usuario.correo) {
    // Se persiste `para` (el correo) para poder drenar pendientes tras un reinicio.
    correo = await Notificacion.create({
      ...base,
      canal: 'Correo',
      estado: 'Pendiente',
      intentos: 0,
      para: usuario.correo,
    });
    encolarCorreo({
      notificacionId: idDe(correo),
      para: usuario.correo,
      asunto,
      contenido,
    });
  }

  return { plantilla, app, correo };
};

// Envía un correo usando una plantilla, sin usuario registrado (p. ej. el
// correo de producción de centros). Persiste el correo pendiente para que
// el arranque/cron pueda drenarlo.
const notificarCorreo = async ({ para, codigo, variables = {} }) => {
  if (!para) return null;
  const plantilla = await resolverPlantilla(codigo);
  if (!plantilla) {
    console.error(`⚠️  Plantilla "${codigo}" no encontrada: no se envió el correo`);
    return null;
  }
  const asunto = renderPlantilla(plantilla.asunto, variables);
  const contenido = renderPlantilla(plantilla.cuerpo, variables);

  const correo = await Notificacion.create({
    usuario: null,
    plantilla: null,
    solicitud: null,
    canal: 'Correo',
    estado: 'Pendiente',
    intentos: 0,
    para,
    asunto,
    contenido,
  });
  encolarCorreo({ notificacionId: idDe(correo), para, asunto, contenido });
  return { asunto, contenido };
};

const fecha = () => new Date().toLocaleString('es-CO');

// ---- Suscriptores de eventos (los 7 eventos del dominio) ----

// Evento: pagoAprobado -> instrucciones de muestra (RF-12)
const notificarPagoAprobado = async ({ solicitud, cotizacion }) => {
  if (!solicitud) return null;
  const usuario = await duenioDe(solicitud);
  if (!usuario) return null;

  const instrucciones = textoInstrucciones(instruccionesDeMuestra(cotizacion));
  return notificar({
    codigo: 'pago-aprobado',
    usuario,
    solicitud,
    variables: {
      orden: solicitud.codigoPresolicitud,
      estado: 'Pagada',
      fecha: fecha(),
      instrucciones: instrucciones || 'Consulta el catálogo por detalle.',
    },
  });
};

// Evento: pagoRechazado -> notificación con el motivo (RF-09, RF-33)
const notificarPagoRechazado = async ({ solicitud, motivo }) => {
  if (!solicitud) return null;
  const usuario = await duenioDe(solicitud);
  if (!usuario) return null;

  return notificar({
    codigo: 'pago-rechazado',
    usuario,
    solicitud,
    variables: {
      orden: solicitud.codigoPresolicitud,
      motivo: motivo || 'Sin observación registrada',
      fecha: fecha(),
    },
  });
};

// Evento: muestraRechazada -> decisión Reenviar / Recoger (RF-20)
const notificarMuestraRechazada = async ({ muestra, solicitud, motivo, actaPdf }) => {
  if (!solicitud) return null;
  const usuario = await duenioDe(solicitud);
  if (!usuario) return null;

  return notificar({
    codigo: 'muestra-rechazada',
    usuario,
    solicitud,
    variables: {
      orden: solicitud.codigoPresolicitud,
      codigoMuestra: muestra?.codigoMuestra || '(sin código)',
      motivo: motivo?.nombre || 'Sin motivo registrado',
      observaciones: muestra?.observaciones || '',
      actaPdf: actaPdf || 'disponible en recepción',
      fecha: fecha(),
    },
  });
};

// Evento: muestraAvance -> hito de etapa para el cliente (RF-22/Fase 6)
const notificarAvanceMuestra = async ({ muestra, solicitud, etapa, porcentajeAvance }) => {
  if (!solicitud) return null;
  const usuario = await duenioDe(solicitud);
  if (!usuario) return null;

  return notificar({
    codigo: 'muestra-avance',
    usuario,
    solicitud,
    variables: {
      orden: solicitud.codigoPresolicitud,
      codigoMuestra: muestra?.codigoMuestra || '(sin código)',
      estado: etapa,
      porcentajeAvance: porcentajeAvance ?? 0,
      fecha: fecha(),
    },
  });
};

// Evento: analistaAsignado -> aviso al analista (RF-28)
const notificarAsignacionAnalista = async ({ analista, muestra, accion, motivo }) => {
  if (!analista?.correo) return null;

  const verbo =
    accion === 'Reapertura' ? 'Se reabrió' : accion === 'Reasignar' ? 'Se te reasignó' : 'Se te asignó';

  return notificar({
    codigo: 'analista-asignado',
    usuario: analista,
    solicitud: null,
    variables: {
      verbo,
      codigoMuestra: muestra?.codigoMuestra || '(sin código)',
      prioridad: muestra?.prioridad || '—',
      turno: muestra?.numeroTurno ?? '—',
      estado: muestra?.etapaActual || '—',
      motivo: motivo || 'Sin motivo registrado',
      fecha: fecha(),
    },
  });
};

// Evento: solicitudCerrada -> cierre con encuesta completa e informe aprobado (RF-26/RF-15)
const notificarCierre = async ({ solicitud }) => {
  if (!solicitud) return null;
  const usuario = await duenioDe(solicitud);
  if (!usuario) return null;

  return notificar({
    codigo: 'solicitud-cerrada',
    usuario,
    solicitud,
    variables: { orden: solicitud.codigoPresolicitud, estado: 'Cerrada', fecha: fecha() },
  });
};

// Evento: inconformidadActualizada -> aviso al usuario dueño de la PQR (RF-31)
const notificarInconformidad = async ({ inconformidad }) => {
  if (!inconformidad) return null;
  const usuario = await Usuario.findById(inconformidad.usuario).select('nombres correo');
  if (!usuario) return null;

  return notificar({
    codigo: 'pqr-actualizada',
    usuario,
    solicitud: inconformidad.solicitud || null,
    variables: {
      tipo: inconformidad.tipo,
      estado: inconformidad.estado,
      respuesta: inconformidad.respuesta ? `Respuesta del laboratorio: ${inconformidad.respuesta}` : '',
      fecha: fecha(),
    },
  });
};

export {
  instruccionesDeMuestra,
  textoInstrucciones,
  notificar,
  notificarCorreo,
  configurarNotificaciones,
  notificarPagoAprobado,
  notificarPagoRechazado,
  notificarMuestraRechazada,
  notificarAvanceMuestra,
  notificarAsignacionAnalista,
  notificarCierre,
  notificarInconformidad,
};
