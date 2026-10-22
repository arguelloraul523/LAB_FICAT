import { body } from 'express-validator';

// ============================================================
// Validaciones de notificaciones (RF-14).
// La creación es solo del Administrador (las rutas lo restringen);
// aquí se valida el formato mínimo: canal, asunto y contenido.
// `usuario` es opcional (el Admin puede notificar a un usuario puntual).
// ============================================================

const validarNotificacion = [
  body('canal').isIn(['Correo', 'App']).withMessage('El canal debe ser Correo o App'),
  body('asunto').trim().notEmpty().withMessage('El asunto es obligatorio'),
  body('contenido').notEmpty().withMessage('El contenido es obligatorio'),
  body('usuario').optional({ nullable: true }).isMongoId().withMessage('El usuario debe ser un id válido'),
  body('solicitud').optional({ nullable: true }).isMongoId().withMessage('La solicitud debe ser un id válido'),
];

export { validarNotificacion };
