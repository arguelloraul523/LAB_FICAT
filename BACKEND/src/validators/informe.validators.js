import { body } from 'express-validator';

// ============================================================
// Informe de resultados (RF-25): el PDF lo sube el Administrador.
// El archivo llega por multer ("archivoPdf"); aquí se valida la muestra.
// ============================================================

const validarCrearInforme = [
  body('muestra').isMongoId().withMessage('La muestra es obligatoria y debe ser un id válido'),
];

export { validarCrearInforme };
