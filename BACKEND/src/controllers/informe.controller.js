import asyncHandler from '../utils/asyncHandler.js';
import crudFactory from '../utils/crudFactory.js';
import Informe from '../models/Informe.js';
import { crearInforme, aprobarInforme, prepararDescarga } from '../services/informes.service.js';
import { abrirLectura, existe } from '../services/storage.service.js';

// ============================================================
// Informes de resultados (RF-25, RF-26).
// La lógica vive en services/informes.service.js: subida como
// "En revisión", aprobación del Administrador y descarga protegida
// (nunca por /uploads; exige encuesta completa).
// ============================================================

const base = crudFactory(Informe, ['muestra', 'revisadoPor']);

// Sube el PDF validado (el estado lo fija el servidor: "En revisión").
const crear = asyncHandler(async (req, res) => {
  const informe = await crearInforme({ body: req.body });
  res.status(201).json({ ok: true, data: informe });
});

// Aprueba el informe (solo Administrador): pasa a "Aprobado".
const aprobar = asyncHandler(async (req, res) => {
  const informe = await aprobarInforme({ id: req.params.id, usuario: req.usuario });
  res.json({ ok: true, data: informe });
});

// Descarga protegida: stream autenticado, solo con informe aprobado
// y encuesta completa (403 ENCUESTA_PENDIENTE si falta). El binario
// viene de GridFS (persiste en Atlas, no en el filesystem).
const descargarPdf = asyncHandler(async (req, res) => {
  const { archivoPdf, nombre } = await prepararDescarga(req.params.id);

  if (!archivoPdf || !(await existe(archivoPdf))) {
    return res.status(404).json({ ok: false, mensaje: 'El archivo del informe no está disponible' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
  const stream = abrirLectura(archivoPdf);
  // Si el archivo desaparece entre la verificación y la lectura, responder 404
  // en vez de dejar un 'error' sin manejar (rompe el proceso).
  stream.on('error', () => {
    if (!res.headersSent) {
      res.status(404).json({ ok: false, mensaje: 'El archivo del informe no está disponible' });
    } else {
      res.end();
    }
  });
  stream.pipe(res);
});

const informes = { ...base, crear, aprobar, descargarPdf };

export { informes };
