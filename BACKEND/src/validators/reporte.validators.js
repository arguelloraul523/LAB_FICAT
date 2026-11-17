import { query } from 'express-validator';

// ============================================================
// Validaciones de reportes (RF-30): rango de fechas y formato.
// `desde`/`hasta` deben ser fechas ISO (YYYY-MM-DD) y `hasta` no
// puede ser anterior a `desde`.
// ============================================================

const validarReporte = [
  query('desde')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('La fecha "desde" debe ser válida (YYYY-MM-DD)'),
  query('hasta')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('La fecha "hasta" debe ser válida (YYYY-MM-DD)'),
  query('formato')
    .optional()
    .isIn(['json', 'csv', 'xlsx', 'pdf'])
    .withMessage('El formato debe ser json, csv, xlsx o pdf'),
  query('hasta').custom((valor, { req }) => {
    const desde = req.query.desde;
    const hasta = valor;
    if (desde && hasta && new Date(hasta) < new Date(desde)) {
      throw new Error('La fecha "hasta" no puede ser anterior a "desde"');
    }
    return true;
  }),
];

export { validarReporte };
