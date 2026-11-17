import { body } from 'express-validator';

// ============================================================
// Validaciones del catálogo (RF-05, RF-06, RF-31).
// Los campos son opcionales (el modelo Mongoose ya exige los obligatorios
// al crear); aquí se valida el FORMATO cuando el campo llega, para que el
// mismo validador sirva en creación y actualización.
// ============================================================

const validarCategoria = [
  body('nombre').optional().trim().notEmpty().withMessage('El nombre de la categoría es obligatorio'),
  body('descripcion').optional({ nullable: true }).isString().withMessage('La descripción debe ser texto'),
];

const validarTipoMuestra = [
  body('nombre').optional().trim().notEmpty().withMessage('El nombre del tipo de muestra es obligatorio'),
  body('descripcion').optional({ nullable: true }).isString().withMessage('La descripción debe ser texto'),
];

// El precio (RF-06) debe ser un número >= 0; las referencias deben ser ids válidos.
const validarExamen = [
  body('categoria').optional().isMongoId().withMessage('La categoría debe ser un id válido'),
  body('tipoMuestra').optional().isMongoId().withMessage('El tipo de muestra debe ser un id válido'),
  body('nombre').optional().trim().notEmpty().withMessage('El nombre del examen es obligatorio'),
  body('descripcion').optional({ nullable: true }).isString().withMessage('La descripción debe ser texto'),
  body('metodo').optional({ nullable: true }).trim().isString().withMessage('El método debe ser texto'),
  body('tecnica').optional({ nullable: true }).trim().isString().withMessage('La técnica debe ser texto'),
  body('tercerizado').optional().isBoolean().withMessage('tercerizado debe ser booleano'),
  body('precio')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El precio debe ser un número mayor o igual a 0')
    .bail()
    .toFloat(),
  body('tiempoRespuestaDias')
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage('El tiempo de respuesta debe ser un entero >= 0'),
  body('cantidadRequerida')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('La cantidad requerida debe ser un número >= 0'),
  body('unidadMedida').optional().trim().notEmpty().withMessage('La unidad de medida es obligatoria'),
  body('tipoEnvase').optional().trim().notEmpty().withMessage('El tipo de envase es obligatorio'),
  body('temperaturaConservacion')
    .optional({ nullable: true })
    .isString()
    .withMessage('La temperatura de conservación debe ser texto'),
  body('tiempoMaxTrasladoHoras')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('El tiempo máximo de traslado debe ser un número >= 0'),
  body('requiereTemperatura').optional().isBoolean().withMessage('requiereTemperatura debe ser booleano'),
  body('activo').optional().isBoolean().withMessage('activo debe ser booleano'),
];

export { validarCategoria, validarTipoMuestra, validarExamen };
