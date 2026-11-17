import express from 'express';
const router = express.Router();
import { usuarios, verificaciones } from '../controllers/usuario.controller.js';
import { validarUsuario, validarUsuarioActualizacion, validarVerificacionSena } from '../validators/usuario.validators.js';
import validarCampos from '../validators/index.js';
import { proteger, autorizar } from '../middlewares/auth.middleware.js';
import { fijarUsuarioPropio } from '../middlewares/propietario.middleware.js';
import { permitirCampos } from '../constants/camposPermitidos.js';
import { crearUpload } from '../config/multer.js';
import { guardarSubida } from '../services/storage.service.js';

// Soporte de verificación SENA: se guarda en GridFS (no se sirve por /uploads).
const uploadVerificacion = crearUpload();

// --- Verificación SENA (definida ANTES de /:id para evitar conflictos) ---
router.get('/verificaciones', proteger, autorizar('Administrador'), verificaciones.listar);
router.get('/verificaciones/:id', proteger, autorizar('Administrador'), verificaciones.obtener);
// `validarVerificacionSena` y `validarCampos` van DESPUÉS de multer: el correo
// llega como campo de texto del multipart y multer es quien llena req.body.
router.post('/verificaciones', proteger, permitirCampos('usuario'), fijarUsuarioPropio('usuario'), uploadVerificacion.single('archivoSoporte'), guardarSubida('archivoSoporte', 'verificacion-sena'), validarVerificacionSena, validarCampos, verificaciones.crear);
router.put('/verificaciones/:id/aprobar', proteger, autorizar('Administrador'), verificaciones.aprobar);
router.put('/verificaciones/:id/rechazar', proteger, autorizar('Administrador'), verificaciones.rechazar);
router.delete('/verificaciones/:id', proteger, autorizar('Administrador'), verificaciones.eliminar);

// --- Usuarios (gestión exclusiva del Administrador) ---
router.get('/', proteger, autorizar('Administrador'), usuarios.listar);
router.get('/:id', proteger, autorizar('Administrador'), usuarios.obtener);
router.post('/', proteger, autorizar('Administrador'), validarUsuario, validarCampos, usuarios.crear);
router.put('/:id', proteger, autorizar('Administrador'), validarUsuarioActualizacion, validarCampos, usuarios.actualizar);
router.delete('/:id', proteger, autorizar('Administrador'), usuarios.eliminar);

export default router;
