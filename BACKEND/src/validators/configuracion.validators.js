import { body } from 'express-validator';

// ============================================================
// Validaciones de configuración del sistema (RF-31):
// plantillas, opciones del asistente IA, parámetros y tipologías.
// Los campos son opcionales (el modelo exige los obligatorios al crear);
// aquí se valida el FORMATO. Las escrituras son del Administrador.
// ============================================================

const validarPlantilla = [
  body('codigo').optional().trim().notEmpty().withMessage('El código de la plantilla es obligatorio'),
  body('nombre').optional().trim().notEmpty().withMessage('El nombre de la plantilla es obligatorio'),
  body('tipo')
    .optional()
    .isIn(['Notificación', 'Alerta de Retraso', 'Resultados'])
    .withMessage('El tipo de plantilla no es válido'),
  body('canal')
    .optional()
    .isIn(['Correo', 'App', 'Ambos'])
    .withMessage('El canal debe ser Correo, App o Ambos'),
  body('asunto').optional().trim().notEmpty().withMessage('El asunto es obligatorio'),
  body('cuerpo').optional().notEmpty().withMessage('El cuerpo de la plantilla es obligatorio'),
];

const validarOpcionIA = [
  body('numeroOpcion').optional().isInt({ min: 1 }).withMessage('El número de opción debe ser un entero >= 1'),
  body('textoOpcion').optional().trim().notEmpty().withMessage('El texto de la opción es obligatorio'),
  body('prompt').optional().notEmpty().withMessage('El prompt de la opción es obligatorio'),
  body('activa').optional().isBoolean().withMessage('activa debe ser booleano'),
];

const validarParametro = [
  body('clave').optional().trim().notEmpty().withMessage('La clave del parámetro es obligatoria'),
  body('valor').optional().notEmpty().withMessage('El valor del parámetro es obligatorio'),
  body('descripcion').optional({ nullable: true }).isString().withMessage('La descripción debe ser texto'),
];

const validarTipologia = [
  body('nombre').optional().trim().notEmpty().withMessage('El nombre de la tipología es obligatorio'),
];

export { validarPlantilla, validarOpcionIA, validarParametro, validarTipologia };
