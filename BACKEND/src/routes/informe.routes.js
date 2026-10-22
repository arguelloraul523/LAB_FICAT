import express from 'express';
const router = express.Router();
import { informes } from '../controllers/informe.controller.js';
import { proteger, autorizar } from '../middlewares/auth.middleware.js';
import { filtrarPropios, exigirPropietario, alcances } from '../middlewares/propietario.middleware.js';
import { validarCrearInforme } from '../validators/informe.validators.js';
import validarCampos from '../validators/index.js';
import { crearUpload } from '../config/multer.js';
import { guardarSubida } from '../services/storage.service.js';
import Informe from '../models/Informe.js';

// El PDF del informe se guarda en GridFS y solo se descarga por
// GET /informes/:id/pdf (stream autenticado, nunca por /uploads).
const uploadInformes = crearUpload();

// Informes de resultados (RF-25, RF-26)
router.get('/', proteger, filtrarPropios(alcances.informe), informes.listar);

// Descarga protegida: stream autenticado, solo Administrador o Cliente dueño.
// Exige informe "Aprobado" (409) y encuesta completa (403 ENCUESTA_PENDIENTE).
router.get(
  '/:id/pdf',
  proteger,
  autorizar('Administrador', 'Cliente'),
  exigirPropietario(Informe, alcances.informe),
  informes.descargarPdf
);

router.get('/:id', proteger, exigirPropietario(Informe, alcances.informe), informes.obtener);

// Subir el PDF validado: solo Administrador (nace "En revisión").
router.post(
  '/',
  proteger,
  autorizar('Administrador'),
  uploadInformes.single('archivoPdf'),
  guardarSubida('archivoPdf', 'informes'),
  validarCrearInforme,
  validarCampos,
  informes.crear
);

// Aprobación del Jefe de Laboratorio: En revisión -> Aprobado (RF-25).
router.put('/:id/aprobar', proteger, autorizar('Administrador'), informes.aprobar);

router.delete('/:id', proteger, autorizar('Administrador'), informes.eliminar);

export default router;
