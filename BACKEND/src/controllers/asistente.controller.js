import asyncHandler from '../utils/asyncHandler.js';
import { chat } from '../services/asistente.service.js';

// Asistente de IA (RF-11): chat limitado a catálogo y parámetros.
const conversar = asyncHandler(async (req, res) => {
  const data = await chat({
    mensaje: req.body.mensaje,
    opcionId: req.body.opcionId,
    usuario: req.usuario,
  });
  res.json({ ok: true, data });
});

export { conversar };
