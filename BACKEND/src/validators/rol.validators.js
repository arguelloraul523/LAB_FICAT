import { body } from 'express-validator';

// ============================================================
// Validaciones de roles y módulos del sistema (RF-27/RF-31).
// Campos opcionales (el modelo exige los obligatorios al crear);
// aquí se valida el FORMATO. Las escrituras son del Administrador.
// ============================================================

const validarRol = [
  body('nombre').optional().trim().notEmpty().withMessage('El nombre del rol es obligatorio'),
  body('descripcion').optional({ nullable: true }).isString().withMessage('La descripción debe ser texto'),
  body('estado')
    .optional()
    .isIn(['Activo', 'Inactivo'])
    .withMessage('El estado debe ser Activo o Inactivo'),
  body('modulos').optional().isArray().withMessage('modulos debe ser un array de ids'),
  body('modulos.*').isMongoId().withMessage('Cada módulo debe ser un id válido'),
];

const validarModulo = [
  body('nombre').optional().trim().notEmpty().withMessage('El nombre del módulo es obligatorio'),
  body('ruta').optional().trim().notEmpty().withMessage('La ruta del módulo es obligatoria'),
  body('estado')
    .optional()
    .isIn(['Activo', 'Inactivo'])
    .withMessage('El estado debe ser Activo o Inactivo'),
];

export { validarRol, validarModulo };
