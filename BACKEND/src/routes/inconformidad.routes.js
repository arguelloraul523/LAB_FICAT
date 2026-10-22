import express from 'express';
const router = express.Router();
import { inconformidades } from '../controllers/inconformidad.controller.js';
import { proteger, autorizar } from '../middlewares/auth.middleware.js';
import { filtrarPropios, exigirPropietario, fijarUsuarioPropio, alcances } from '../middlewares/propietario.middleware.js';
import { exigirTransicion } from '../middlewares/transicion.middleware.js';
import { permitirCampos } from '../constants/camposPermitidos.js';
import { validarCambiarEstadoPqr, validarCrearInconformidad } from '../validators/inconformidad.validators.js';
import validarCampos from '../validators/index.js';
import Inconformidad from '../models/Inconformidad.js';
import { crearUpload } from '../config/multer.js';
import { guardarSubida } from '../services/storage.service.js';

// Soporte de la PQR: se guarda en GridFS (no se sirve por /uploads).
const uploadSoporte = crearUpload();

// Peticiones, quejas y reclamos (PQR) - RF-31
router.get('/', proteger, filtrarPropios(alcances.inconformidad), inconformidades.listar);
router.get('/:id', proteger, exigirPropietario(Inconformidad, alcances.inconformidad), inconformidades.obtener);
router.post('/', proteger, permitirCampos('usuario'), fijarUsuarioPropio('usuario'), uploadSoporte.single('soporte'), guardarSubida('soporte', 'soportes-pqr'), validarCrearInconformidad, validarCampos, inconformidades.crear);

// Cambio de estado (solo Administrador): transición válida, respuesta
// obligatoria al resolver y fecha de resolución automática.
router.put(
  '/:id',
  proteger,
  autorizar('Administrador'),
  exigirTransicion(Inconformidad, [{ campo: 'estado', maquina: 'inconformidad' }]),
  validarCambiarEstadoPqr,
  validarCampos,
  inconformidades.cambiarEstado
);

router.delete('/:id', proteger, autorizar('Administrador'), inconformidades.eliminar);

export default router;
