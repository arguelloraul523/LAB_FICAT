import { body } from 'express-validator';

// ============================================================
// Validaciones del módulo de autenticación.
// - Registro: confirmación de contraseña (RF-01) + contraseña mínima.
// - Login: correo normalizado a minúsculas.
// - Recuperación / restablecimiento de contraseña.
// - Cambio de contraseña y cambio de rol activo (multirrol).
// ============================================================

// Validaciones para registrar un usuario
// (el rol NO se pide: el servidor asigna Cliente; regla inviolable #12)
const validarRegistro = [
  body('nombres').trim().notEmpty().withMessage('Los nombres son obligatorios'),
  body('apellidos').trim().notEmpty().withMessage('Los apellidos son obligatorios'),
  body('correo').trim().toLowerCase().isEmail().withMessage('Correo electrónico inválido'),
  body('contrasena')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
  // RF-01: confirmación de contraseña obligatoria.
  body('confirmarContrasena')
    .notEmpty()
    .withMessage('La confirmación de la contraseña es obligatoria')
    .bail()
    .custom((valor, { req }) => valor === req.body.contrasena)
    .withMessage('Las contraseñas no coinciden'),
];

// Validaciones para iniciar sesión
const validarLogin = [
  body('correo').trim().toLowerCase().isEmail().withMessage('Correo electrónico inválido'),
  body('contrasena').notEmpty().withMessage('La contraseña es obligatoria'),
];

// Solicitud de recuperación de contraseña (RF: no revela si el correo existe).
const validarOlvideContrasena = [
  body('correo').trim().toLowerCase().isEmail().withMessage('Correo electrónico inválido'),
];

// Restablecimiento de contraseña con token.
const validarRestablecerContrasena = [
  body('token').trim().notEmpty().withMessage('El token de recuperación es obligatorio'),
  body('contrasenaNueva')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
  body('confirmarContrasena')
    .notEmpty()
    .withMessage('La confirmación de la contraseña es obligatoria')
    .bail()
    .custom((valor, { req }) => valor === req.body.contrasenaNueva)
    .withMessage('Las contraseñas no coinciden'),
];

// Cambio de contraseña del usuario autenticado.
const validarCambiarContrasena = [
  body('contrasenaActual').notEmpty().withMessage('La contraseña actual es obligatoria'),
  body('contrasenaNueva')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
  body('confirmarContrasena')
    .notEmpty()
    .withMessage('La confirmación de la contraseña es obligatoria')
    .bail()
    .custom((valor, { req }) => valor === req.body.contrasenaNueva)
    .withMessage('Las contraseñas no coinciden'),
];

// Cambio del rol activo (multirrol): el id debe ser válido.
const validarCambiarRol = [
  body('rol').isMongoId().withMessage('El rol seleccionado no es válido'),
];

// Selección de tipología de cliente (RF-04).
const validarTipologiaUsuario = [
  body('tipologia').isMongoId().withMessage('La tipología seleccionada no es válida'),
];

export {
  validarRegistro,
  validarLogin,
  validarOlvideContrasena,
  validarRestablecerContrasena,
  validarCambiarContrasena,
  validarCambiarRol,
  validarTipologiaUsuario,
};
