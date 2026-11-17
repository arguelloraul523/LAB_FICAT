import express from 'express';
const router = express.Router();

import { conversar } from './chatbot.controller.js';
import { protegerOpcional } from '../middlewares/auth.middleware.js';
import { validarChatAsistente } from './chatbot.validators.js';
import validarCampos from '../validators/index.js';

// Asistente del laboratorio (RF-11): mismo endpoint, sin IA.
// Sin token responde catálogo público; con token añade datos propios.
router.post('/chat', protegerOpcional, validarChatAsistente, validarCampos, conversar);

export default router;
