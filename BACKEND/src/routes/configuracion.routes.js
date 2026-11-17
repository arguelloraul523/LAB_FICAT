import express from 'express';
const router = express.Router();
import { plantillas, opcionesIA, parametros, tipologias, alertas, auditoria } from '../controllers/configuracion.controller.js';
import { proteger, autorizar } from '../middlewares/auth.middleware.js';
import {
  validarPlantilla,
  validarOpcionIA,
  validarParametro,
  validarTipologia,
} from '../validators/configuracion.validators.js';
import validarCampos from '../validators/index.js';

// --- Alertas de retraso (RF-32): disparo manual del cron ---
router.post('/alertas/ejecutar', proteger, autorizar('Administrador'), alertas.ejecutar);

// --- Auditoría de configuración (RF-27/RF-31) ---
router.get('/auditoria', proteger, autorizar('Administrador'), auditoria.listar);

// --- Plantillas de mensaje ---
router.get('/plantillas', proteger, plantillas.listar);
router.get('/plantillas/:id', proteger, plantillas.obtener);
router.post('/plantillas', proteger, autorizar('Administrador'), validarPlantilla, validarCampos, plantillas.crear);
router.put('/plantillas/:id', proteger, autorizar('Administrador'), validarPlantilla, validarCampos, plantillas.actualizar);
router.delete('/plantillas/:id', proteger, autorizar('Administrador'), plantillas.eliminar);

// --- Opciones del asistente IA ---
router.get('/opciones-ia', proteger, opcionesIA.listar);
router.get('/opciones-ia/:id', proteger, opcionesIA.obtener);
router.post('/opciones-ia', proteger, autorizar('Administrador'), validarOpcionIA, validarCampos, opcionesIA.crear);
router.put('/opciones-ia/:id', proteger, autorizar('Administrador'), validarOpcionIA, validarCampos, opcionesIA.actualizar);
router.delete('/opciones-ia/:id', proteger, autorizar('Administrador'), opcionesIA.eliminar);

// --- Parámetros del sistema ---
router.get('/parametros', proteger, parametros.listar);
router.get('/parametros/:id', proteger, parametros.obtener);
router.post('/parametros', proteger, autorizar('Administrador'), validarParametro, validarCampos, parametros.crear);
router.put('/parametros/:id', proteger, autorizar('Administrador'), validarParametro, validarCampos, parametros.actualizar);
router.delete('/parametros/:id', proteger, autorizar('Administrador'), parametros.eliminar);

// --- Tipologías de cliente ---
router.get('/tipologias', proteger, tipologias.listar);
router.get('/tipologias/:id', proteger, tipologias.obtener);
router.post('/tipologias', proteger, autorizar('Administrador'), validarTipologia, validarCampos, tipologias.crear);
router.put('/tipologias/:id', proteger, autorizar('Administrador'), validarTipologia, validarCampos, tipologias.actualizar);
router.delete('/tipologias/:id', proteger, autorizar('Administrador'), tipologias.eliminar);

export default router;
