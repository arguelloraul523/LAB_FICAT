import asyncHandler from '../utils/asyncHandler.js';
import crudFactory from '../utils/crudFactory.js';
import PreguntaEncuesta from '../models/PreguntaEncuesta.js';
import Encuesta from '../models/Encuesta.js';
import { registrarEncuesta } from '../services/encuestas.service.js';

// ============================================================
// Encuestas de satisfacción (RF-26).
// El catálogo de preguntas sigue siendo CRUD; el registro de una
// encuesta pasa por services/encuestas.service.js, que exige todas
// las preguntas activas en escala 1-5 y marca `completa`.
// ============================================================

const preguntas = crudFactory(PreguntaEncuesta);
const base = crudFactory(Encuesta, ['solicitud', 'respuestas.pregunta']);

const crear = asyncHandler(async (req, res) => {
  const encuesta = await registrarEncuesta({ body: req.body, usuario: req.usuario });
  res.status(201).json({ ok: true, data: encuesta });
});

const encuestas = { ...base, crear };

export { preguntas, encuestas };
