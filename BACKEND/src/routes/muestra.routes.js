import express from 'express';
const router = express.Router();
import { muestras, historial } from '../controllers/muestra.controller.js';
import { proteger, autorizar } from '../middlewares/auth.middleware.js';
import { exigirTransicion } from '../middlewares/transicion.middleware.js';
import { filtrarPropios, exigirPropietario, alcances } from '../middlewares/propietario.middleware.js';
import {
  validarBuscarMuestra,
  validarCrearMuestra,
  validarCambiarEtapa,
  validarAsignar,
  validarReabrir,
  validarDatosCliente,
} from '../validators/muestra.validators.js';
import validarCampos from '../validators/index.js';
import Muestra from '../models/Muestra.js';
import HistorialMuestra from '../models/HistorialMuestra.js';

// --- Historial de muestras (definido ANTES de /:id) ---
// Solo lectura (RF-24). El Cliente ve únicamente el historial de SUS muestras
// (propiedad); el personal ve el historial técnico (el Analista sin datos de cliente).
router.get(
  '/historial',
  proteger,
  autorizar('Administrador', 'Recepcionista', 'Analista', 'Cliente'),
  filtrarPropios(alcances.historial),
  historial.listar
);
router.get(
  '/historial/:id',
  proteger,
  autorizar('Administrador', 'Recepcionista', 'Analista', 'Cliente'),
  exigirPropietario(HistorialMuestra, alcances.historial),
  historial.obtener
);

// --- Recepción (definido ANTES de /:id) ---
// Búsqueda por código de pre-solicitud (RF-17) y cola del día (RF-19)
router.get(
  '/buscar',
  proteger,
  autorizar('Administrador', 'Recepcionista'),
  validarBuscarMuestra,
  validarCampos,
  muestras.buscar
);
router.get(
  '/cola',
  proteger,
  autorizar('Administrador', 'Recepcionista', 'Analista'),
  muestras.cola
);

// --- Muestras ---
router.get('/', proteger, filtrarPropios(alcances.muestra), muestras.listar);
router.get('/:id', proteger, exigirPropietario(Muestra, alcances.muestra), muestras.obtener);
router.post(
  '/',
  proteger,
  autorizar('Administrador', 'Recepcionista'),
  validarCrearMuestra,
  validarCampos,
  muestras.crear
);
// Rótulo imprimible 58/80 mm sin datos del cliente (RF-21)
router.get(
  '/:id/rotulo',
  proteger,
  autorizar('Administrador', 'Recepcionista', 'Analista'),
  muestras.rotulo
);
// Hoja de trabajo imprimible A4 anónima (RF-22)
router.get(
  '/:id/hoja-trabajo',
  proteger,
  autorizar('Administrador', 'Recepcionista', 'Analista'),
  muestras.hojaTrabajo
);
// Cambio de etapa: transición válida + justificación en Re-ensayo (RF-23)
router.put(
  '/:id/cambiar-etapa',
  proteger,
  autorizar('Administrador', 'Recepcionista', 'Analista'),
  validarCambiarEtapa,
  validarCampos,
  muestras.cambiarEtapa
);
// Asignación / reasignación de analista con motivo (RF-28, solo Administrador)
router.put(
  '/:id/asignar',
  proteger,
  autorizar('Administrador'),
  validarAsignar,
  validarCampos,
  muestras.asignar
);
// Reapertura de una muestra Finalizada con motivo (RF-28, solo Administrador)
router.put(
  '/:id/reabrir',
  proteger,
  autorizar('Administrador'),
  validarReabrir,
  validarCampos,
  muestras.reabrir
);
// Des-anonimización: contraseña + motivo auditado (RF-29)
router.put(
  '/:id/datos-cliente',
  proteger,
  autorizar('Administrador', 'Recepcionista'),
  validarDatosCliente,
  validarCampos,
  muestras.datosCliente
);
// Edición directa: sin el Analista (no puede saltarse la justificación
// del Re-ensayo escribiendo etapaActual, RF-23).
router.put(
  '/:id',
  proteger,
  autorizar('Administrador', 'Recepcionista'),
  exigirTransicion(Muestra, [
    { campo: 'estado', maquina: 'muestra' },
    { campo: 'etapaActual', maquina: 'etapa' },
  ]),
  muestras.actualizar
);
router.delete('/:id', proteger, autorizar('Administrador'), muestras.eliminar);

export default router;
