import express from 'express';
const router = express.Router();
import { dashboard, reporte } from '../controllers/reporte.controller.js';
import { proteger, autorizar } from '../middlewares/auth.middleware.js';
import { validarReporte } from '../validators/reporte.validators.js';
import validarCampos from '../validators/index.js';

// Dashboard (RF-27): Administrador y Recepcionista.
router.get('/dashboard', proteger, autorizar('Administrador'), dashboard);

// Reportes por rango (RF-30, con cifras financieras): solo Administrador.
// ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&formato=json|csv|xlsx|pdf
router.get('/', proteger, autorizar('Administrador'), validarReporte, validarCampos, reporte);

export default router;
