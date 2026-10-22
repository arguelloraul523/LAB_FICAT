import { body } from 'express-validator';

// Asistente de IA (RF-11): mensaje obligatorio, opción predefinida opcional.
const validarChatAsistente = [
  body('mensaje').trim().notEmpty().withMessage('El mensaje es obligatorio'),
  body('opcionId')
    .optional({ nullable: true })
    .isMongoId()
    .withMessage('La opción del asistente no es válida'),
];

export { validarChatAsistente };
