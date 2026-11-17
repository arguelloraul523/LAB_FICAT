import asyncHandler from '../utils/asyncHandler.js';
import { chat } from './chatbot.service.js';

// Asistente del laboratorio (sin IA): catálogo público y datos propios.
const conversar = asyncHandler(async (req, res) => {
  const data = await chat({
    mensaje: req.body.mensaje,
    usuario: req.usuario || null,
    historial: req.body.historial || [],
  });
  res.json({ ok: true, data });
});

export { conversar };
