import express from 'express';
const router = express.Router();
import { cuentasRecaudo, cupones, pagos } from '../controllers/pago.controller.js';
import { proteger, autorizar } from '../middlewares/auth.middleware.js';
import { filtrarPropios, exigirPropietario, alcances } from '../middlewares/propietario.middleware.js';
import { validarRegistrarPago, validarVerificarPago, validarCuentaRecaudo } from '../validators/pago.validators.js';
import validarCampos from '../validators/index.js';
import CuponPago from '../models/CuponPago.js';
import Pago from '../models/Pago.js';
import { crearUpload } from '../config/multer.js';
import { guardarSubida } from '../services/storage.service.js';

// Comprobantes de pago: se guardan en GridFS (no se sirven por /uploads).
const uploadComprobante = crearUpload();

// --- Cuentas de recaudo ---
router.get('/cuentas', proteger, cuentasRecaudo.listar);
router.get('/cuentas/:id', proteger, cuentasRecaudo.obtener);
router.post('/cuentas', proteger, autorizar('Administrador'), validarCuentaRecaudo, validarCampos, cuentasRecaudo.crear);
router.put('/cuentas/:id', proteger, autorizar('Administrador'), validarCuentaRecaudo, validarCampos, cuentasRecaudo.actualizar);
router.delete('/cuentas/:id', proteger, autorizar('Administrador'), cuentasRecaudo.eliminar);

// --- Cupones de pago ---
router.get('/cupones', proteger, filtrarPropios(alcances.cupon), cupones.listar);
router.get('/cupones/:id', proteger, exigirPropietario(CuponPago, alcances.cupon), cupones.obtener);
router.post('/cupones', proteger, autorizar('Administrador'), cupones.crear);
router.put('/cupones/:id', proteger, autorizar('Administrador'), cupones.actualizar);
router.delete('/cupones/:id', proteger, autorizar('Administrador'), cupones.eliminar);

// --- Pagos ---
// Bandeja de pendientes y consulta del cliente ANTES de /:id (orden de rutas).
// El Analista queda fuera de pagos (RF-22): no maneja datos de pago.
router.get('/pendientes', proteger, autorizar('Administrador'), pagos.pendientes);
router.get(
  '/mis-pagos',
  proteger,
  autorizar('Administrador', 'Cliente'),
  filtrarPropios(alcances.pago),
  pagos.misPagos
);
router.get(
  '/',
  proteger,
  autorizar('Administrador', 'Cliente'),
  filtrarPropios(alcances.pago),
  pagos.listar
);
router.get(
  '/:id',
  proteger,
  autorizar('Administrador', 'Cliente'),
  exigirPropietario(Pago, alcances.pago),
  pagos.obtener
);
router.post(
  '/',
  proteger,
  autorizar('Administrador', 'Cliente'),
  uploadComprobante.single('archivoComprobante'),
  guardarSubida('archivoComprobante', 'comprobantes'),
  validarRegistrarPago,
  validarCampos,
  pagos.crear
);
router.put(
  '/:id/verificar',
  proteger,
  autorizar('Administrador'),
  validarVerificarPago,
  validarCampos,
  pagos.verificar
);
router.delete('/:id', proteger, autorizar('Administrador'), pagos.eliminar);

export default router;
