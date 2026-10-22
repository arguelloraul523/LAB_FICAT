import express from 'express';
const router = express.Router();
import { motivos, rechazos } from '../controllers/rechazo.controller.js';
import { proteger, autorizar } from '../middlewares/auth.middleware.js';
import { validarCrearRechazo, validarDecidirRechazo, validarMotivo } from '../validators/rechazo.validators.js';
import validarCampos from '../validators/index.js';
import { crearUpload } from '../config/multer.js';
import { guardarSubida } from '../services/storage.service.js';

// Evidencia fotográfica del rechazo: se guarda en GridFS (no se sirve por /uploads).
const uploadEvidencia = crearUpload();

// --- Motivos de rechazo (definido ANTES de /:id) ---
// El catálogo de motivos es del personal (no del Cliente): RF-20, matriz §2.
router.get('/motivos', proteger, autorizar('Administrador', 'Recepcionista', 'Analista'), motivos.listar);
router.get('/motivos/:id', proteger, autorizar('Administrador', 'Recepcionista', 'Analista'), motivos.obtener);
router.post('/motivos', proteger, autorizar('Administrador'), validarMotivo, validarCampos, motivos.crear);
router.put('/motivos/:id', proteger, autorizar('Administrador'), validarMotivo, validarCampos, motivos.actualizar);
router.delete('/motivos/:id', proteger, autorizar('Administrador'), motivos.eliminar);

// --- Rechazos (RF-20) ---
router.get('/', proteger, autorizar('Administrador', 'Recepcionista', 'Analista'), rechazos.listar);
router.get('/:id', proteger, autorizar('Administrador', 'Recepcionista', 'Analista'), rechazos.obtener);
// Motivo del catálogo OBLIGATORIO (regla #7); el acta la genera el servidor;
// la evidencia fotográfica es opcional (multer).
router.post(
  '/',
  proteger,
  autorizar('Administrador', 'Recepcionista'),
  uploadEvidencia.single('evidenciaFoto'),
  guardarSubida('evidenciaFoto', 'evidencias'),
  validarCrearRechazo,
  validarCampos,
  rechazos.crear
);
// Decisión del cliente (dueño) o del personal: Reenviar o Recoger (RF-20).
// El Analista queda fuera: no registra decisiones de rechazo.
router.put('/:id/decision', proteger, autorizar('Administrador', 'Recepcionista', 'Cliente'), validarDecidirRechazo, validarCampos, rechazos.decidir);
router.put('/:id', proteger, autorizar('Administrador', 'Recepcionista'), rechazos.actualizar);
router.delete('/:id', proteger, autorizar('Administrador'), rechazos.eliminar);

export default router;
