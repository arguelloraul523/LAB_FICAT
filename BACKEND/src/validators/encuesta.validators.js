import { body } from 'express-validator';

// ============================================================
// Encuesta de satisfacción (RF-26): escala 1-5 y todas las
// preguntas obligatorias. La completitud real se verifica en el
// servicio contra las preguntas activas del catálogo.
// ============================================================

const validarRegistrarEncuesta = [
  body('solicitud').isMongoId().withMessage('La solicitud es obligatoria y debe ser un id válido'),
  body('respuestas')
    .isArray({ min: 1 })
    .withMessage('Debes responder todas las preguntas de la encuesta'),
  body('respuestas.*.pregunta').isMongoId().withMessage('Cada respuesta debe indicar la pregunta'),
  body('respuestas.*.calificacion')
    .isInt({ min: 1, max: 5 })
    .withMessage('Cada calificación debe ser un número entero entre 1 y 5'),
  body('comentario').optional({ nullable: true }).isString().withMessage('El comentario debe ser texto'),
];

// Catálogo de preguntas de la encuesta (escritura: Administrador).
const validarPregunta = [
  body('texto').trim().notEmpty().withMessage('El texto de la pregunta es obligatorio'),
  body('tipo')
    .isIn(['Calificación', 'Opción múltiple', 'Sí/No', 'Texto abierto'])
    .withMessage('El tipo de pregunta no es válido'),
  body('activa').optional().isBoolean().withMessage('activa debe ser booleano'),
];

export { validarRegistrarEncuesta, validarPregunta };
