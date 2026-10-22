import PDFDocument from 'pdfkit';
import { guardar } from './storage.service.js';

// ============================================================
// Generación de PDFs (cotización RF-06 y acta de rechazo RF-20).
// El PDF se genera en MEMORIA (buffer) y se guarda en GridFS
// (services/storage.service.js): persiste en MongoDB Atlas y
// sobrevive a los deploys de Render. Se descarga por los endpoints
// autorizados (nunca por /uploads).
// ============================================================

const formatoCOP = (valor) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    valor || 0
  );

// Genera el PDF como buffer (helper común).
const pdfABuffer = (construir) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    construir(doc);
    doc.end();
  });

// Cotización de análisis (RF-06). Devuelve el id GridFS del PDF.
const generarPdfCotizacion = async (cotizacion, solicitud) => {
  const buffer = await pdfABuffer((doc) => {
    const cliente = solicitud?.usuario || {};
    const tipoMuestra = solicitud?.tipoMuestra?.nombre || '—';

    doc.fontSize(18).text('Laboratorio - Sistema de Gestión (SENA)', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(12).text('COTIZACIÓN DE ANÁLISIS', { align: 'center' });
    doc.moveDown();

    doc.fontSize(11);
    doc.text(`Número: ${cotizacion.numeroCotizacion}`);
    doc.text(`Fecha: ${new Date(cotizacion.fechaEmision).toLocaleString('es-CO')}`);
    doc.text(`Pre-solicitud: ${solicitud?.codigoPresolicitud || '—'}`);
    doc.text(`Cliente: ${[cliente.nombres, cliente.apellidos].filter(Boolean).join(' ') || '—'}`);
    doc.text(`Correo: ${cliente.correo || '—'}`);
    doc.text(`Tipo de muestra: ${tipoMuestra}`);
    doc.moveDown();

    doc.fontSize(11).text('Detalles', { underline: true });
    doc.moveDown(0.3);

    const columnas = { descripcion: doc.x, cantidad: 280, precio: 350, subtotal: 440 };
    doc.fontSize(10);
    doc.text('Examen', columnas.descripcion, doc.y, { width: 220 });
    doc.text('Cant.', columnas.cantidad, doc.y - 13, { width: 60 });
    doc.text('Precio unit.', columnas.precio, doc.y - 13, { width: 85 });
    doc.text('Subtotal', columnas.subtotal, doc.y - 13, { width: 90 });
    doc.moveDown(0.5);

    (cotizacion.detalles || []).forEach((detalle) => {
      const y = doc.y;
      const subtotal = detalle.precioUnitario * detalle.cantidadMuestras;
      doc.text(String(detalle.examen?.nombre || detalle.examen), columnas.descripcion, y, { width: 220 });
      doc.text(String(detalle.cantidadMuestras), columnas.cantidad, y, { width: 60 });
      doc.text(formatoCOP(detalle.precioUnitario), columnas.precio, y, { width: 85 });
      doc.text(formatoCOP(subtotal), columnas.subtotal, y, { width: 90 });
      doc.moveDown(0.4);
    });

    doc.moveDown();
    doc.fontSize(12);
    doc.text(`VALOR TOTAL: ${formatoCOP(cotizacion.valorTotal)}`, { align: 'right' });

    if (cotizacion.exonerada) {
      doc.moveDown(0.3);
      doc
        .fontSize(10)
        .text('Cotización exonerada por ser usuario SENA verificado (no aplica pago).', {
          align: 'right',
        });
    }

    doc.moveDown();
    doc.fontSize(9).fillColor('#555555').text(
      'Los precios corresponden al catálogo vigente al momento de cotizar (snapshot).',
      { align: 'left' }
    );
  });

  return guardar(buffer, `cotizaciones/${cotizacion.numeroCotizacion}.pdf`);
};

// ============================================================
// Acta de rechazo de muestra (RF-20).
// La genera el SERVIDOR (nadie la sube): código de la muestra,
// motivo parametrizado, observaciones y firmas del personal.
// Devuelve el id GridFS del PDF.
// ============================================================
const generarPdfActaRechazo = async ({ muestra, motivo, observaciones, registradoPor }) => {
  const buffer = await pdfABuffer((doc) => {
    doc.fontSize(16).text('Laboratorio - Sistema de Gestión (SENA)', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(13).text('ACTA DE RECHAZO DE MUESTRA', { align: 'center' });
    doc.moveDown();

    doc.fontSize(11);
    doc.text(`Código de muestra: ${muestra.codigoMuestra || '—'}`);
    doc.text(`Prioridad: ${muestra.prioridad || '—'}   Turno: ${muestra.numeroTurno ?? '—'}`);
    doc.text(`Fecha y hora: ${new Date().toLocaleString('es-CO')}`);
    doc.text(`Pre-solicitud: ${muestra.solicitud?.codigoPresolicitud || '—'}`);
    doc.moveDown();

    doc.fontSize(11).text('Motivo del rechazo', { underline: true });
    doc.moveDown(0.3);
    doc.text(String(motivo?.nombre || '—'));
    doc.moveDown(0.3);
    if (observaciones) {
      doc.text(`Observaciones: ${observaciones}`);
      doc.moveDown(0.3);
    }
    doc.text(
      `Registrado por: ${[registradoPor?.nombres, registradoPor?.apellidos].filter(Boolean).join(' ') || '—'}`
    );
    doc.moveDown();

    doc
      .fontSize(10)
      .fillColor('#555555')
      .text(
        'El ciclo técnico de la muestra queda cancelado. El cliente puede reenviar una nueva muestra ' +
          'o recoger la personalmente en recepción; para ello debe responder la notificación con su ' +
          'decisión (Reenviar / Recoger).',
        { align: 'justify' }
      );
  });

  return guardar(buffer, `rechazos/acta-${muestra.codigoMuestra || muestra._id}.pdf`);
};

export { generarPdfCotizacion, generarPdfActaRechazo, pdfABuffer };
