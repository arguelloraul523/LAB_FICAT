import PDFDocument from 'pdfkit';
import { guardar } from './storage.service.js';
import ParametroSistema from '../models/ParametroSistema.js';

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

const formatoFecha = (valor) =>
  valor ? new Date(valor).toLocaleDateString('es-CO', { timeZone: 'UTC' }) : '—';

// Lee un parámetro del sistema (clave-valor) con un valor por defecto.
const leerParametro = async (clave, defecto) => {
  const parametro = await ParametroSistema.findOne({ clave });
  return parametro?.valor ?? defecto;
};

// Datos institucionales del laboratorio (formulario LABFICAT). Se leen de los
// parámetros del sistema; si no existen, se usan los valores del formulario.
const leerDatosLaboratorio = async () => ({
  nombre: await leerParametro('nombreLaboratorio', 'LABFICAT'),
  descripcion:
    (await leerParametro(
      'descripcionLaboratorio',
      'Laboratorio de Caracterización Fisicoquímica de Alimentos del Centro Agroturístico de San Gil, Santander'
    )) || '',
  nit: await leerParametro('nit', '899.999.034-1'),
  direccion: await leerParametro('direccion', 'Calle 22 No. 09 – 82, San Gil, Santander'),
  correo: await leerParametro('correoInstitucional', 'labficat@sena.edu.co'),
  codigoFormato: await leerParametro('codigoFormatoCotizacion', 'CAT-ST-OC-F-002'),
  responsable:
    (await leerParametro(
      'responsableLaboratorio',
      'Manuel Fernando Córdoba Porras — Ing. Químico, MSc — Responsable de la Gestión Técnica y Administrativa del Laboratorio'
    )) || '',
});

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

// Cotización de análisis (RF-06) con el formato del formulario LABFICAT
// "Oferta de servicios" (CAT-ST-OC-F-002). Devuelve el id GridFS del PDF.
const generarPdfCotizacion = async (cotizacion, solicitud) => {
  const lab = await leerDatosLaboratorio();
  const cliente = solicitud?.usuario || {};
  const tipoMuestra = solicitud?.tipoMuestra?.nombre || '—';
  const nombreCliente =
    cliente.razonSocial || [cliente.nombres, cliente.apellidos].filter(Boolean).join(' ') || '—';

  const buffer = await pdfABuffer((doc) => {
    const x0 = doc.page.margins.left;

    // ===== Encabezado institucional (LABFICAT) =====
    doc.font('Helvetica-Bold').fontSize(14).text('OFERTA DE SERVICIOS', { align: 'center' });
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(9).text(lab.descripcion, { align: 'center' });
    doc.moveDown(0.3);
    doc.text(`NIT: ${lab.nit}`, { align: 'center' });
    doc.text(`Dirección: ${lab.direccion}`, { align: 'center' });
    doc.text(`Correo electrónico: ${lab.correo}`, { align: 'center' });
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').fontSize(10).text('COTIZACIÓN DE ANÁLISIS', { align: 'center' });
    doc.moveDown(0.5);

    doc.font('Helvetica').fontSize(9);
    doc.text(`Cotización No.: ${cotizacion.numeroCotizacion}`);
    doc.text(`Fecha de emisión: ${formatoFecha(cotizacion.fechaEmision)}`);
    doc.text(`Código: ${lab.codigoFormato}`);
    doc.text(`Pre-solicitud: ${solicitud?.codigoPresolicitud || '—'}`);
    doc.moveDown(0.5);

    // ===== 1. Datos del cliente =====
    doc.font('Helvetica-Bold').fontSize(10).text('1. Datos del cliente', { underline: true });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(9);
    doc.text(`Cliente: ${nombreCliente}`);
    doc.text(`NIT / C.C.: ${cliente.numeroDocumento || '—'}`);
    doc.text(`Dirección: ${cliente.direccion || '—'}`);
    doc.text(`Ciudad: ${cliente.ciudad || '—'}    Departamento: ${cliente.departamento || '—'}`);
    doc.text(`Cargo: ${cliente.cargo || '—'}`);
    doc.text(`Persona de contacto: ${cliente.personaContacto || '—'}`);
    doc.text(`Clasificación/Tipología: ${cliente.tipologia?.nombre || '—'}`);
    doc.text(`Correo electrónico: ${cliente.correo || '—'}`);
    doc.text(`Celular y/o Teléfono: ${cliente.telefono || '—'}`);
    doc.moveDown(0.5);

    // ===== 2. Propuesta técnica y económica =====
    doc.font('Helvetica-Bold').fontSize(10).text('2. Propuesta técnica y económica', { underline: true });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(9);
    doc.text(`Validez de la oferta: ${formatoFecha(cotizacion.validezOferta)}`);
    doc.text(
      `Entrega de resultados: ${cotizacion.entregaResultadosDias ?? 15} días hábiles contados a partir de la fecha de recepción de la muestra`
    );
    doc.text(`Tipo de muestra: ${tipoMuestra}`);
    doc.moveDown(0.4);

    // Tabla: Código de referencia · Ensayo · Método · Técnica · Cantidad · V. unitario · Costo
    const cols = [
      { label: 'Código', w: 35 },
      { label: 'Ensayo', w: 115 },
      { label: 'Método', w: 105 },
      { label: 'Técnica', w: 80 },
      { label: 'Cant.', w: 40 },
      { label: 'V. unitario', w: 65 },
      { label: 'Costo', w: 72 },
    ];
    const cabY = doc.y;
    let cx = x0;
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#333333');
    cols.forEach((c) => {
      doc.text(c.label, cx, cabY, { width: c.w });
      cx += c.w;
    });
    doc.moveDown(0.3);

    doc.font('Helvetica').fontSize(8).fillColor('#000000');
    (cotizacion.detalles || []).forEach((detalle, i) => {
      const y = doc.y;
      const subtotal = detalle.precioUnitario * detalle.cantidadMuestras;
      const nombre = detalle.examen?.nombre || String(detalle.examen || '—');
      const metodo = detalle.metodo || detalle.examen?.metodo || '—';
      const tecnica = detalle.tecnica || detalle.examen?.tecnica || '—';
      const tercerizado = detalle.examen?.tercerizado ? '**' : '';

      const valores = [
        String(i + 1),
        `${nombre}${tercerizado}`,
        metodo,
        tecnica,
        String(detalle.cantidadMuestras),
        formatoCOP(detalle.precioUnitario),
        formatoCOP(subtotal),
      ];
      let rx = x0;
      valores.forEach((v, idx) => {
        doc.text(v, rx, y, { width: cols[idx].w });
        rx += cols[idx].w;
      });
      doc.moveDown(0.35);
    });

    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(9);
    doc.text(`Costo del ítem: ${formatoCOP(cotizacion.valorTotal)}`, { align: 'right' });
    doc.text(`Subtotal: ${formatoCOP(cotizacion.valorTotal)}`, { align: 'right' });
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(`Total: ${formatoCOP(cotizacion.valorTotal)}`, { align: 'right' });

    if (cotizacion.exonerada) {
      doc.moveDown(0.3);
      doc
        .font('Helvetica').fontSize(9)
        .fillColor('#555555')
        .text('Cotización exonerada por ser usuario SENA verificado (no aplica pago).', {
          align: 'right',
        });
    }
    doc.moveDown(0.5);

    // ===== 3. Condiciones comerciales =====
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text('Condiciones comerciales', {
      underline: true,
    });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(8).fillColor('#333333');
    doc.text(
      'Forma de Pago: se debe realizar la totalidad del pago de la presente oferta de servicios antes de la ' +
        'recepción y procesamiento de las muestras (como máximo antes de emitir el informe de resultados).',
      { align: 'justify' }
    );
    doc.moveDown(0.2);
    doc.text(
      'Para realizar el pago podrá acercarse al área de producción de centro y solicitar Prefactura y cupón de pago, ' +
        'el cual podrá cancelar en cualquier corresponsal Bancolombia.',
      { align: 'justify' }
    );
    doc.moveDown(0.2);
    doc.text(
      'Únicamente se dará por cancelado el servicio cuando se envíe el comprobante de pago al correo institucional ' +
        `${lab.correo} y se verifique el pago con el área de producción de centro.`,
      { align: 'justify' }
    );
    doc.moveDown(0.5);

    // ===== 4. Aceptación del servicio =====
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text('Aceptación del servicio', {
      underline: true,
    });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(8).fillColor('#333333');
    doc.text('Acepto las condiciones del servicio descritas en la presente oferta incluidos sus anexos.', {
      align: 'justify',
    });
    doc.moveDown(1.2);
    doc.text('Firma de aceptación: ____________________________________');
    doc.moveDown(0.8);
    doc.text('Nombre: ______________________________    C.C.: ______________________________');
    doc.moveDown(0.6);

    doc.fontSize(8).fillColor('#555555').text(`Elaborada y emitida por: ${lab.responsable}`, {
      align: 'left',
    });
    doc.moveDown(0.2);
    doc.text(
      'Los precios corresponden al catálogo vigente al momento de cotizar (snapshot). Los ensayos marcados con ' +
        '"**" se tercerizan con laboratorio externo.',
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
  const lab = await leerDatosLaboratorio();
  const buffer = await pdfABuffer((doc) => {
    doc.fontSize(13).text(lab.nombre, { align: 'center' });
    doc.fontSize(8).text(lab.descripcion, { align: 'center' });
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
