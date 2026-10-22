import HistorialMuestra from '../models/HistorialMuestra.js';
import Muestra from '../models/Muestra.js';
import MotivoRechazo from '../models/MotivoRechazo.js';
import Rechazo from '../models/Rechazo.js';
import { transicionValida } from '../constants/estados.js';
import { emitir, suscribir } from './eventos.service.js';
import { generarPdfActaRechazo } from './pdf.service.js';
import { notificarMuestraRechazada } from './notificaciones.service.js';

// ============================================================
// Lógica de negocio del RECHAZO de muestras (RF-20, reglas #7 y #10).
//
//   - crearRechazo: motivo parametrizado obligatorio (del catálogo),
//     evidencia opcional, acta PDF GENERADA POR EL SERVIDOR, la muestra
//     pasa a "Rechazada" y su ciclo técnico se cancela (etapa
//     "Cancelada"); luego emite "muestraRechazada" para notificar al
//     cliente con su decisión Reenviar / Recoger.
//   - decidirRechazo: el cliente dueño (o recepción) registra la
//     decisión "Reenviar" o "Recoger" (RF-20).
//
// La creación NO es el `crear` de crudFactory: exige transición válida
// y jamás acepta estado/etapa desde el body (regla #12).
// ============================================================

const errorCon = (statusCode, mensaje) => {
  const err = new Error(mensaje);
  err.statusCode = statusCode;
  return err;
};

// Suscripción de la notificación al evento (una sola vez).
suscribir('muestraRechazada', notificarMuestraRechazada);

// Rechaza una muestra: motivo del catálogo + acta + estado + evento (RF-20).
// `generarActa` es inyectable para las pruebas sin BD.
const crearRechazo = async ({
  body = {},
  evidenciaFoto = null,
  usuario,
  generarActa = generarPdfActaRechazo,
}) => {
  const muestra = await Muestra.findById(body.muestra).populate({
    path: 'solicitud',
    populate: { path: 'usuario', select: 'nombres apellidos correo' },
  });
  if (!muestra) throw errorCon(404, 'Muestra no encontrada');

  // Regla inviolable #7: el motivo es obligatorio y viene del catálogo.
  const motivo = await MotivoRechazo.findById(body.motivo);
  if (!motivo) throw errorCon(400, 'El motivo de rechazo es obligatorio y debe existir en el catálogo');

  if (muestra.estado === 'Rechazada') throw errorCon(409, 'La muestra ya fue rechazada');

  // Transición válida hacia "Rechazada" (Recibida/Aceptada/En observación).
  if (!transicionValida('muestra', muestra.estado, 'Rechazada')) {
    throw errorCon(409, `Transición inválida de "estado" de la muestra: ${muestra.estado} → Rechazada`);
  }

  const estadoPrevio = `${muestra.estado} / ${muestra.etapaActual}`;
  const observaciones = String(body.observaciones || '').trim() || null;

  // Acta PDF generada por el servidor (RF-20): devuelve el nombre del archivo.
  const actaPdf = await generarActa({ muestra, motivo, observaciones, registradoPor: usuario });

  const rechazo = await Rechazo.create({
    muestra: muestra._id,
    motivo: motivo._id,
    registradoPor: usuario._id,
    observaciones,
    evidenciaFoto: evidenciaFoto || null,
    actaPdf,
  });

  // La muestra pasa a "Rechazada" y el ciclo técnico se cancela.
  muestra.estado = 'Rechazada';
  muestra.etapaActual = 'Cancelada';
  await muestra.save();

  await HistorialMuestra.create({
    muestra: muestra._id,
    usuario: usuario._id,
    accion: 'Rechazo',
    etapa: 'Cancelada',
    valorAnterior: estadoPrevio,
    valorNuevo: `Rechazada · ${motivo.nombre}`,
    ...(observaciones ? { comentario: observaciones } : {}),
  });

  // Evento: notificación al cliente (App + correo) con su decisión.
  await emitir('muestraRechazada', {
    rechazo,
    muestra,
    solicitud: muestra.solicitud,
    motivo,
    actaPdf,
  });

  return { rechazo, muestra };
};

// Decisión del cliente tras el rechazo (RF-20): Reenviar o Recoger.
const decidirRechazo = async ({ id, decision, usuario, esCliente }) => {
  const rechazo = await Rechazo.findById(id).populate({
    path: 'muestra',
    populate: { path: 'solicitud', select: 'usuario codigoPresolicitud' },
  });
  if (!rechazo) throw errorCon(404, 'Rechazo no encontrado');

  // Regla #10: el Cliente solo decide sobre sus propios rechazos.
  if (esCliente) {
    const dueno = rechazo.muestra?.solicitud?.usuario;
    if (String(dueno) !== String(usuario._id)) {
      throw errorCon(403, 'No tienes acceso a este rechazo');
    }
  }

  if (!['Reenviar', 'Recoger'].includes(decision)) {
    throw errorCon(400, 'La decisión debe ser "Reenviar" o "Recoger"');
  }

  rechazo.decisionCliente = decision;
  await rechazo.save();
  return rechazo;
};

export { crearRechazo, decidirRechazo };
