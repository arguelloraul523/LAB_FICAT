import express from 'express';
const router = express.Router();
import { registrar, login, perfil, cambiarContrasena, olvideContrasena, restablecerContrasena, cambiarRol, actualizarTipologia, actualizarPerfil } from '../controllers/auth.controller.js';
import {
  validarRegistro,
  validarLogin,
  validarOlvideContrasena,
  validarRestablecerContrasena,
  validarCambiarContrasena,
  validarCambiarRol,
  validarTipologiaUsuario,
  validarActualizarPerfil,
} from '../validators/auth.validators.js';
import validarCampos from '../validators/index.js';
import { proteger } from '../middlewares/auth.middleware.js';
import { authLimiter } from '../middlewares/rateLimit.middleware.js';

// Autenticación (rutas sensibles con límite de peticiones)
router.post('/registro', authLimiter, validarRegistro, validarCampos, registrar);
router.post('/login', authLimiter, validarLogin, validarCampos, login);
router.post('/olvide-contrasena', authLimiter, validarOlvideContrasena, validarCampos, olvideContrasena);
router.post('/restablecer-contrasena', authLimiter, validarRestablecerContrasena, validarCampos, restablecerContrasena);
router.get('/perfil', proteger, perfil);
// Actualización de los datos propios del perfil.
router.put('/perfil', proteger, validarActualizarPerfil, validarCampos, actualizarPerfil);
router.put('/cambiar-contrasena', proteger, validarCambiarContrasena, validarCampos, cambiarContrasena);
// Cambia el rol activo cuando la persona tiene varios roles asignados
router.post('/cambiar-rol', proteger, validarCambiarRol, validarCampos, cambiarRol);
// Selección de tipología de cliente (RF-04)
router.put('/tipologia', proteger, validarTipologiaUsuario, validarCampos, actualizarTipologia);

export default router;
