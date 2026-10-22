import express from 'express';
const router = express.Router();
import { conversar } from '../controllers/asistente.controller.js';
import { proteger } from '../middlewares/auth.middleware.js';
import { validarChatAsistente } from '../validators/asistente.validators.js';
import validarCampos from '../validators/index.js';

// Asistente de IA (RF-11)
router.post('/chat', proteger, validarChatAsistente, validarCampos, conversar);

export default router;
