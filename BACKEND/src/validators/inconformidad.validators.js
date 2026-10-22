import { body } from 'express-validator';
import { ESTADOS } from '../constants/estados.js';

// ============================================================
// PQR / inconformidades (RF-31): flujo de estados y resolución.
// La transición válida se valida en el middleware/servicio (409);
// aquí se comprueba el formato del estado y la respuesta.
// ============================================================

const validarCambiarEstadoPqr = [
  body('estado').isIn(ESTADOS.inconformidad).withMessage('El estado de la PQR no es válido'),
  body('respuesta').optional({ nullable: true }).isString().withMessage('La respuesta debe ser texto'),
];

// Crear una PQR (RF-31): tipo obligatorio, descripción obligatoria y
// categoría/solicitud opcionales.
const validarCrearInconformidad = [
  body('tipo')
    .isIn(['Petición', 'Queja', 'Reclamo'])
    .withMessage('El tipo debe ser Petición, Queja o Reclamo'),
  body('descripcion').trim().notEmpty().withMessage('La descripción de la PQR es obligatoria'),
  body('categoria').optional({ nullable: true }).isString().withMessage('La categoría debe ser texto'),
  body('solicitud').optional({ nullable: true }).isMongoId().withMessage('La solicitud debe ser un id válido'),
];

export { validarCambiarEstadoPqr, validarCrearInconformidad };
