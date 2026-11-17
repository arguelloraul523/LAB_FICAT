import asyncHandler from '../utils/asyncHandler.js';
import { dashboardReporte, resumenReporte } from '../services/reportes.service.js';
import { aCsv, aXlsx, aPdf } from '../services/export.service.js';

// ============================================================
// Reportes y dashboard (RF-27, RF-30).
// El dashboard lo ven Administrador y Recepcionista; los reportes
// financieros solo el Administrador (se controla en las rutas).
// ============================================================

const dashboard = asyncHandler(async (req, res) => {
  const data = await dashboardReporte();
  res.json({ ok: true, data });
});

const reporte = asyncHandler(async (req, res) => {
  const resumen = await resumenReporte({ desde: req.query.desde, hasta: req.query.hasta });
  const formato = String(req.query.formato || 'json').toLowerCase();

  if (formato === 'csv') {
    res.type('text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte.csv"');
    return res.send(aCsv(resumen));
  }
  if (formato === 'xlsx') {
    const buffer = await aXlsx(resumen);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte.xlsx"');
    return res.send(buffer);
  }
  if (formato === 'pdf') {
    const buffer = await aPdf(resumen);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte.pdf"');
    return res.send(buffer);
  }
  res.json({ ok: true, data: resumen });
});

export { dashboard, reporte };
