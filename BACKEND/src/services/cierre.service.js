import Encuesta from '../models/Encuesta.js';
import Informe from '../models/Informe.js';
import Muestra from '../models/Muestra.js';
import Solicitud from '../models/Solicitud.js';
import { emitir, suscribir } from './eventos.service.js';
import { notificarCierre } from './notificaciones.service.js';

// ============================================================
// Cierre de la solicitud (RF-26 / RF-15).
// Una solicitud se cierra SOLO si tiene un informe Aprobado de alguna
// de sus muestras Y la encuesta de satisfacción quedó completa.
// El cierre lo dispara el servidor (automático) desde
// services/informes.service.js y services/encuestas.service.js.
// ============================================================

suscribir('solicitudCerrada', notificarCierre);

// ¿La solicitud ya tiene una encuesta completa? (RF-26)
const encuestaCompleta = async (solicitudId) =>
  Boolean(await Encuesta.findOne({ solicitud: solicitudId, completa: true }));

// ¿Alguna muestra de la solicitud tiene un informe Aprobado? (RF-25)
const informeAprobado = async (solicitudId) => {
  const muestras = await Muestra.find({ solicitud: solicitudId }).select('_id');
  const ids = muestras.map((m) => m._id);
  if (!ids.length) return false;
  return Boolean(await Informe.findOne({ muestra: { $in: ids }, estado: 'Aprobado' }));
};

// Intenta cerrar la solicitud: solo actúa si se cumplen AMBAS condiciones.
// Devuelve la solicitud cerrada o null si aún no procede.
const intentarCerrarSolicitud = async (solicitudId) => {
  const solicitud = await Solicitud.findById(solicitudId);
  if (!solicitud || solicitud.estado !== 'En proceso') return null;

  if (!(await informeAprobado(solicitudId))) return null;
  if (!(await encuestaCompleta(solicitudId))) return null;

  solicitud.estado = 'Finalizada';
  solicitud.fechaCierre = new Date();
  await solicitud.save();

  await emitir('solicitudCerrada', { solicitud });
  return solicitud;
};

export { encuestaCompleta, informeAprobado, intentarCerrarSolicitud };
