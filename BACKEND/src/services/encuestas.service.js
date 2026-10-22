import Encuesta from '../models/Encuesta.js';
import PreguntaEncuesta from '../models/PreguntaEncuesta.js';
import Solicitud from '../models/Solicitud.js';
import { intentarCerrarSolicitud } from './cierre.service.js';

// ============================================================
// Encuesta de satisfacción (RF-26).
// Escala 1-5, TODAS las preguntas activas son obligatorias.
// Un envío incompleto se rechaza (400) y solo una encuesta válida
// marca `completa: true`, habilitando la descarga del informe.
// ============================================================

const errorCon = (statusCode, mensaje) => {
  const err = new Error(mensaje);
  err.statusCode = statusCode;
  return err;
};

const registrarEncuesta = async ({ body, usuario }) => {
  const solicitud = await Solicitud.findById(body?.solicitud);
  if (!solicitud) throw errorCon(404, 'Registro no encontrado');

  // Propiedad: un Cliente solo responde la encuesta de su propia solicitud (regla #10).
  if (usuario.rol?.nombre === 'Cliente' && String(solicitud.usuario) !== String(usuario._id)) {
    throw errorCon(403, 'No tienes acceso a este registro');
  }

  const respuestas = Array.isArray(body?.respuestas) ? body.respuestas : [];

  // Preguntas activas del catálogo (obligatorias todas).
  const preguntas = await PreguntaEncuesta.find({ activa: true }).select('_id');
  const idsActivas = preguntas.map((p) => String(p._id));

  const dadas = new Map(respuestas.map((r) => [String(r.pregunta), r.calificacion]));

  const faltantes = idsActivas.filter((id) => !dadas.has(id));
  if (faltantes.length > 0) {
    throw errorCon(400, `Encuesta incompleta: faltan ${faltantes.length} pregunta(s) por responder`);
  }

  const desconocidas = [...dadas.keys()].filter((id) => !idsActivas.includes(id));
  if (desconocidas.length > 0) {
    throw errorCon(400, 'La encuesta incluye preguntas que no están activas en el catálogo');
  }

  const fueraDeRango = respuestas.filter((r) => {
    const c = Number(r.calificacion);
    return !Number.isInteger(c) || c < 1 || c > 5;
  });
  if (fueraDeRango.length > 0) {
    throw errorCon(400, 'Cada calificación debe ser un número entero entre 1 y 5');
  }

  const existente = await Encuesta.findOne({ solicitud: solicitud._id });
  if (existente) throw errorCon(409, 'La encuesta de esta solicitud ya fue registrada');

  const encuesta = await Encuesta.create({
    solicitud: solicitud._id,
    comentario: body.comentario || null,
    fechaRespuesta: new Date(),
    completa: true,
    respuestas: respuestas.map((r) => ({
      pregunta: r.pregunta,
      calificacion: Number(r.calificacion),
    })),
  });

  // Con la encuesta lista, si el informe ya está aprobado, la solicitud se cierra.
  await intentarCerrarSolicitud(solicitud._id);

  return encuesta;
};

export { registrarEncuesta };
