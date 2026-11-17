import { body } from 'express-validator';
import { RE_CORREO_SENA } from '../constants/sena.js';

// Validaciones para crear un usuario (gestión exclusiva del Administrador).
// La contraseña es obligatoria: ya no se usa una contraseña por defecto.
const validarUsuario = [
  body('nombres').trim().notEmpty().withMessage('Los nombres son obligatorios'),
  body('apellidos').trim().notEmpty().withMessage('Los apellidos son obligatorios'),
  body('correo').trim().toLowerCase().isEmail().withMessage('Correo electrónico inválido'),
  body('tipoDocumento').isIn(['CC', 'TI', 'CE', 'NIT']).withMessage('Tipo de documento inválido'),
  body('numeroDocumento').trim().notEmpty().withMessage('El número de documento es obligatorio'),
  body('telefono').trim().notEmpty().withMessage('El teléfono es obligatorio'),
  body('razonSocial').optional({ nullable: true }).trim().isString().withMessage('La razón social debe ser texto'),
  body('direccion').optional({ nullable: true }).trim().isString().withMessage('La dirección debe ser texto'),
  body('ciudad').optional({ nullable: true }).trim().isString().withMessage('La ciudad debe ser texto'),
  body('departamento').optional({ nullable: true }).trim().isString().withMessage('El departamento debe ser texto'),
  body('cargo').optional({ nullable: true }).trim().isString().withMessage('El cargo debe ser texto'),
  body('personaContacto').optional({ nullable: true }).trim().isString().withMessage('La persona de contacto debe ser texto'),
  body('rol').isMongoId().withMessage('El rol es obligatorio y debe ser un id válido'),
  body('contrasena')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('tipoUsuario')
    .optional()
    .isIn(['SENA', 'EXTERNO'])
    .withMessage('El tipo de usuario debe ser SENA o EXTERNO'),
];

// Validaciones para actualizar un usuario: los campos son opcionales,
// pero si llegan deben tener formato válido (regla #12: whitelist).
const validarUsuarioActualizacion = [
  body('nombres').optional().trim().notEmpty().withMessage('Los nombres no pueden ir vacíos'),
  body('apellidos').optional().trim().notEmpty().withMessage('Los apellidos no pueden ir vacíos'),
  body('correo')
    .optional()
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Correo electrónico inválido'),
  body('tipoDocumento')
    .optional()
    .isIn(['CC', 'TI', 'CE', 'NIT'])
    .withMessage('Tipo de documento inválido'),
  body('rol').optional().isMongoId().withMessage('El rol debe ser un id válido'),
  body('roles').optional().isArray().withMessage('roles debe ser un array de ids'),
  body('roles.*').isMongoId().withMessage('Cada rol debe ser un id válido'),
  body('tipoUsuario')
    .optional()
    .isIn(['SENA', 'EXTERNO'])
    .withMessage('El tipo de usuario debe ser SENA o EXTERNO'),
  body('activo').optional().isBoolean().withMessage('activo debe ser booleano'),
  body('tipologia').optional().isMongoId().withMessage('La tipología debe ser un id válido'),
  body('razonSocial').optional({ nullable: true }).trim().isString().withMessage('La razón social debe ser texto'),
  body('direccion').optional({ nullable: true }).trim().isString().withMessage('La dirección debe ser texto'),
  body('ciudad').optional({ nullable: true }).trim().isString().withMessage('La ciudad debe ser texto'),
  body('departamento').optional({ nullable: true }).trim().isString().withMessage('El departamento debe ser texto'),
  body('cargo').optional({ nullable: true }).trim().isString().withMessage('El cargo debe ser texto'),
  body('personaContacto').optional({ nullable: true }).trim().isString().withMessage('La persona de contacto debe ser texto'),
  body('contrasena')
    .optional()
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
];

// Validación de la solicitud de verificación SENA (RF-02).
// - El correo institucional debe terminar en @sena.edu.co (exacto).
// - Debe indicar número de ficha O número de contrato/cédula.
// - El soporte (carné o certificado) es obligatorio (llega por multer).
const validarVerificacionSena = [
  body('correoInstitucional')
    .trim()
    .notEmpty()
    .withMessage('El correo institucional es obligatorio')
    .bail()
    .toLowerCase()
    .isEmail()
    .withMessage('Correo institucional inválido')
    .bail()
    .matches(RE_CORREO_SENA)
    .withMessage('Solo se aceptan correos @sena.edu.co'),
  body('numeroFicha').optional({ nullable: true }).trim(),
  body('numeroContratoCedula').optional({ nullable: true }).trim(),
  body('numeroFicha').custom((valor, { req }) => {
    const ficha = String(valor || '').trim();
    const contrato = String(req.body.numeroContratoCedula || '').trim();
    if (!ficha && !contrato) {
      throw new Error('Debe indicar número de ficha o número de contrato/cédula (RF-02)');
    }
    return true;
  }),
  body('archivoSoporte')
    .notEmpty()
    .withMessage('El soporte (carné o certificado) en PDF o imagen es obligatorio'),
];

export { validarUsuario, validarUsuarioActualizacion, validarVerificacionSena };
