import { body } from 'express-validator';

// ============================================================
// Validaciones del rechazo de muestras (RF-20, regla #7).
// El motivo es obligatorio y debe ser un id del CATÁLOGO parametrizado
// (la existencia real se verifica en el servicio); sin motivo no hay
// rechazo. La evidencia (foto) es opcional y llega por multer.
// ============================================================

const DECISIONES_RECHAZO = ['Reenviar', 'Recoger'];

// Crear un rechazo: POST /api/rechazos
const validarCrearRechazo = [
  body('muestra').isMongoId().withMessage('La muestra es obligatoria y debe ser un id válido'),
  body('motivo')
    .isMongoId()
    .withMessage('El motivo de rechazo es obligatorio y debe ser un id del catálogo'),
  body('observaciones').optional({ nullable: true }).isString().trim(),
];

// Decisión del cliente: PUT /api/rechazos/:id/decision
const validarDecidirRechazo = [
  body('decision')
    .isIn(DECISIONES_RECHAZO)
    .withMessage(`La decisión debe ser una de: ${DECISIONES_RECHAZO.join(', ')}`),
];

// Catálogo de motivos de rechazo (RF-20): solo el nombre es obligatorio.
const validarMotivo = [
  body('nombre').optional().trim().notEmpty().withMessage('El nombre del motivo es obligatorio'),
];

export { DECISIONES_RECHAZO, validarCrearRechazo, validarDecidirRechazo, validarMotivo };
