import Inconformidad from '../models/Inconformidad.js';
import { transicionValida } from '../constants/estados.js';
import { emitir, suscribir } from './eventos.service.js';
import { notificarInconformidad } from './notificaciones.service.js';

// ============================================================
// PQR / inconformidades (RF-31).
// Flujo de estados Abierta -> En revisión -> Resuelta -> Cerrada
// (una resuelta puede reabrirse a En revisión). Al resolver se exige
// respuesta y se fija la fecha de resolución.
// ============================================================

suscribir('inconformidadActualizada', notificarInconformidad);

const errorCon = (statusCode, mensaje) => {
  const err = new Error(mensaje);
  err.statusCode = statusCode;
  return err;
};

const cambiarEstadoInconformidad = async ({ id, estado, respuesta, usuario }) => {
  const pqr = await Inconformidad.findById(id);
  if (!pqr) throw errorCon(404, 'Registro no encontrado');

  if (!transicionValida('inconformidad', pqr.estado, estado)) {
    throw errorCon(409, `Transición inválida de "estado": ${pqr.estado} → ${estado}`);
  }

  const texto = String(respuesta || '').trim();

  // Resolver exige una respuesta (la actual o la que llega en el body).
  if (estado === 'Resuelta' && !texto && !pqr.respuesta) {
    throw errorCon(400, 'La respuesta de la resolución es obligatoria (RF-31)');
  }

  pqr.estado = estado;
  if (texto) pqr.respuesta = texto;
  if (estado === 'Resuelta' && !pqr.fechaResolucion) {
    pqr.fechaResolucion = new Date();
  }
  await pqr.save();

  await emitir('inconformidadActualizada', { inconformidad: pqr });
  return pqr;
};

export { cambiarEstadoInconformidad };
