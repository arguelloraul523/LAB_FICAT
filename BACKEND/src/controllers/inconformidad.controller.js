import asyncHandler from '../utils/asyncHandler.js';
import crudFactory from '../utils/crudFactory.js';
import Inconformidad from '../models/Inconformidad.js';
import { cambiarEstadoInconformidad } from '../services/inconformidades.service.js';

// ============================================================
// PQR / inconformidades (RF-31).
// El cambio de estado pasa por services/inconformidades.service.js:
// valida la transición, exige respuesta al resolver y fija la
// fecha de resolución, notificando al usuario.
// ============================================================

const base = crudFactory(Inconformidad, ['usuario', 'solicitud']);

const cambiarEstado = asyncHandler(async (req, res) => {
  const pqr = await cambiarEstadoInconformidad({
    id: req.params.id,
    estado: req.body.estado,
    respuesta: req.body.respuesta,
    usuario: req.usuario,
  });
  res.json({ ok: true, data: pqr });
});

const inconformidades = { ...base, cambiarEstado };

export { inconformidades };
