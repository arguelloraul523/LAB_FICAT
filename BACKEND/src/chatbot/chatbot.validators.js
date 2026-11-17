import { body } from 'express-validator';

// Asistente del laboratorio: mensaje obligatorio y campos de compatibilidad.
const validarChatAsistente = [
  body('mensaje')
    .isString()
    .withMessage('El mensaje debe ser texto')
    .trim()
    .notEmpty()
    .withMessage('El mensaje es obligatorio')
    .isLength({ max: 2000 })
    .withMessage('El mensaje no puede superar 2000 caracteres'),
  body('modo')
    .optional()
    .isIn(['publico', 'autenticado'])
    .withMessage('El modo no es válido'),
  body('conversacionId')
    .optional({ nullable: true })
    .isString()
    .withMessage('El identificador de conversación no es válido')
    .isLength({ max: 100 })
    .withMessage('El identificador de conversación es demasiado largo'),
  body('historial')
    .optional()
    .isArray({ max: 50 })
    .withMessage('El historial no es válido'),
  // Se acepta por compatibilidad con clientes anteriores; ya no se usa.
  body('opcionId')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('La opción del asistente no es válida'),
];

export { validarChatAsistente };
