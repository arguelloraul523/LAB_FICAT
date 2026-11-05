import express from 'express';
const router = express.Router();
import { notificaciones } from '../controllers/notificacion.controller.js';
import { proteger, autorizar } from '../middlewares/auth.middleware.js';
import { filtrarPropios, exigirPropietario, fijarUsuarioPropio, alcances } from '../middlewares/propietario.middleware.js';
import { permitirCampos } from '../constants/camposPermitidos.js';
import { validarNotificacion, validarEnviarCorreo } from '../validators/notificacion.validators.js';
import validarCampos from '../validators/index.js';
import Notificacion from '../models/Notificacion.js';

// Notificaciones (RF-14). Matriz §2:
//   R (listar/obtener) -> todos (Cliente solo lo suyo),
//   U (marcar leída)   -> todos (Cliente solo lo suyo),
//   C (crear)          -> solo Administrador,
//   D (eliminar)       -> solo Administrador.
router.get('/', proteger, filtrarPropios(alcances.notificacion), notificaciones.listar);
router.get('/:id', proteger, exigirPropietario(Notificacion, alcances.notificacion), notificaciones.obtener);
router.post('/', proteger, autorizar('Administrador'), permitirCampos('usuario'), fijarUsuarioPropio('usuario'), validarNotificacion, validarCampos, notificaciones.crear);
// Envío de un correo libre al cliente (con observaciones): Admin/Recepcionista.
router.post('/enviar-correo', proteger, autorizar('Administrador', 'Recepcionista'), validarEnviarCorreo, validarCampos, notificaciones.enviarCorreo);
router.put('/:id', proteger, exigirPropietario(Notificacion, alcances.notificacion), notificaciones.actualizar);
router.delete('/:id', proteger, autorizar('Administrador'), notificaciones.eliminar);

export default router;
