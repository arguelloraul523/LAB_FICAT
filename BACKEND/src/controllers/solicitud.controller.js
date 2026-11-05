import asyncHandler from '../utils/asyncHandler.js';
import crudFactory from '../utils/crudFactory.js';
import { codigoPresolicitud, codigoCotizacion } from '../services/codigos.service.js';
import { sugerirExamenes } from '../services/sugerencia.service.js';
import { calcularCotizacion } from '../services/cotizacion.service.js';
import { generarPdfCotizacion } from '../services/pdf.service.js';
import { emitirCupon } from '../services/cupones.service.js';
import { guardar, abrirLectura, existe, eliminar } from '../services/storage.service.js';
import { transicionValida } from '../constants/estados.js';
import { sanitizarBody } from '../constants/camposPermitidos.js';
import { esCliente } from '../middlewares/propietario.middleware.js';
import Solicitud from '../models/Solicitud.js';
import Cotizacion from '../models/Cotizacion.js';
import Examen from '../models/Examen.js';
import ParametroSistema from '../models/ParametroSistema.js';

// Lee un parámetro del sistema (clave-valor) con un valor por defecto.
const leerParametro = async (clave, defecto) => {
  const parametro = await ParametroSistema.findOne({ clave });
  return parametro?.valor ?? defecto;
};

// Convierte los ids enviados por el cliente en subdocumentos con precio de catálogo.
// El precio NUNCA llega del cliente: lo lee el servidor (RF-06, regla #11).
const cargarExamenes = async (ids = [], idsSugeridos = []) => {
  const unicos = [...new Set((ids || []).map(String))];
  if (unicos.length === 0) return [];

  const examenes = await Examen.find({ _id: { $in: unicos }, activo: true });
  const porId = new Map(examenes.map((e) => [String(e._id), e]));
  const faltantes = unicos.filter((id) => !porId.has(id));

  if (faltantes.length > 0) {
    const error = new Error(`Exámenes no válidos o inactivos: ${faltantes.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  return unicos.map((id) => {
    const examen = porId.get(id);
    return {
      examen: examen._id,
      origen: idsSugeridos.includes(id) ? 'Sugerido' : 'Manual',
      precioUnitario: examen.precio, // snapshot al momento de elegir
    };
  });
};

// ===== Solicitudes =====
const crearSolicitud = asyncHandler(async (req, res) => {
  const codigo = await codigoPresolicitud();

  // Batería sugerida (RF-16): siempre se devuelve, aunque el cliente no envíe lista.
  const sugerencias = await sugerirExamenes({
    tipoMuestra: req.body.tipoMuestra,
    categoria: req.body.categoria,
    descripcionMuestra: req.body.descripcionMuestra,
    limite: req.body.limite,
  });

  // Lista final: la que el cliente confirma (ajustada). Si no envía nada, queda vacía.
  const examenes = await cargarExamenes(
    Array.isArray(req.body.examenes) ? req.body.examenes : [],
    sugerencias.map((s) => String(s.examen))
  );

  // Regla inviolable #12: whitelist del body. El estado, la exoneración, el código,
  // la autorización y la fecha de cierre los fija SIEMPRE el servidor, nunca el cliente.
  // Esto cierra el bypass de pago (RF-09): no se puede crear una solicitud ya "Pagada".
  const datos = sanitizarBody(req.body, { permitir: ['usuario'] });
  datos.codigoPresolicitud = codigo;
  datos.examenes = examenes;
  datos.estado = 'Pre-solicitud';
  datos.exonerada = false;
  datos.fechaCierre = null;
  datos.autorizacion = null;
  if (esCliente(req)) datos.usuario = req.usuario._id;

  const solicitud = await Solicitud.create(datos);
  res.status(201).json({ ok: true, data: solicitud, sugerencias });
});

// Sugiere análisis según tipo de muestra, categoría y palabras de la descripción.
const sugerencias = asyncHandler(async (req, res) => {
  const data = await sugerirExamenes({
    tipoMuestra: req.body.tipoMuestra,
    categoria: req.body.categoria,
    descripcionMuestra: req.body.descripcionMuestra,
    limite: req.body.limite,
  });
  res.json({ ok: true, total: data.length, data });
});

const solicitudes = {
  ...crudFactory(Solicitud, ['usuario', 'tipoMuestra', 'examenes.examen']),
  crear: crearSolicitud,
  sugerencias,
};

// ===== Cotizaciones =====

const RE_BASE64_IMG = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
const MAX_FIRMA_BASE64 = 800_000; // ~600 KB en binario

// Decodifica la firma del canvas y la guarda en GridFS. Devuelve el id.
const guardarFirma = async (firmaImagen, cotizacionId) => {
  const match = RE_BASE64_IMG.exec(String(firmaImagen || ''));
  if (!match) {
    const error = new Error('La firma debe ser una imagen en base64 (data:image/png;base64,...)');
    error.statusCode = 400;
    throw error;
  }
  if (match[2].length > MAX_FIRMA_BASE64) {
    const error = new Error('La imagen de la firma supera el tamaño máximo (600 KB)');
    error.statusCode = 400;
    throw error;
  }

  return guardar(Buffer.from(match[2], 'base64'), `firmas/firma-${cotizacionId}.png`);
};

// Crear cotización: calcula en el servidor y guarda el PDF (RF-06).
const crearCotizacion = asyncHandler(async (req, res) => {
  const { solicitud, detalles, valorTotal, exonerada } = await calcularCotizacion({
    solicitud: req.body.solicitud,
    examenes: req.body.examenes,
  });

  // Solo se puede cotizar una solicitud en estado inicial (409 en caso contrario).
  if (!transicionValida('solicitud', solicitud.estado, 'Cotizada')) {
    return res.status(409).json({
      ok: false,
      mensaje: `Transición inválida de "estado": ${solicitud.estado} → Cotizada`,
    });
  }

  const numeroCotizacion = await codigoCotizacion();

  // Condiciones del formulario LABFICAT: entrega de resultados y validez de la
  // oferta salen de los parámetros del sistema (snapshot en la cotización).
  const entregaResultadosDias = Number(await leerParametro('diasEntregaResultados', '15')) || 15;
  const diasValidez = Number(await leerParametro('diasValidezOferta', '30')) || 30;
  const validezOferta = new Date(Date.now() + diasValidez * 24 * 60 * 60 * 1000);

  const cotizacion = await Cotizacion.create({
    solicitud: solicitud._id,
    numeroCotizacion,
    detalles,
    valorTotal,
    exonerada,
    entregaResultadosDias,
    validezOferta,
  });

  await cotizacion.populate('detalles.examen');
  const archivoPdf = await generarPdfCotizacion(cotizacion, solicitud);
  cotizacion.archivoPdf = archivoPdf;
  await cotizacion.save();

  solicitud.estado = 'Cotizada';
  await solicitud.save();

  res.status(201).json({ ok: true, data: cotizacion });
});

// Descarga el PDF: solo el dueño de la solicitud o el Administrador (la ruta lo valida).
const descargarPdf = asyncHandler(async (req, res) => {
  const cotizacion = await Cotizacion.findById(req.params.id);
  if (!cotizacion) return res.status(404).json({ ok: false, mensaje: 'Registro no encontrado' });
  if (!cotizacion.archivoPdf || !(await existe(cotizacion.archivoPdf))) {
    return res.status(404).json({ ok: false, mensaje: 'El PDF de la cotización no está disponible' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${cotizacion.numeroCotizacion}.pdf"`);
  const stream = abrirLectura(cotizacion.archivoPdf);
  // Si el archivo desaparece entre la verificación y la lectura, responder 404
  // en vez de dejar un 'error' sin manejar.
  stream.on('error', () => {
    if (!res.headersSent) {
      res.status(404).json({ ok: false, mensaje: 'El PDF de la cotización no está disponible' });
    } else {
      res.end();
    }
  });
  stream.pipe(res);
});

// Aceptar cotización con firma digital (RF-13) + emisión del cupón (RF-09).
const aceptarCotizacion = asyncHandler(async (req, res) => {
  const cotizacion = await Cotizacion.findById(req.params.id);
  if (!cotizacion) return res.status(404).json({ ok: false, mensaje: 'Registro no encontrado' });

  const solicitud = await Solicitud.findById(cotizacion.solicitud).populate('usuario');
  if (!solicitud) return res.status(404).json({ ok: false, mensaje: 'Registro no encontrado' });

  // Una cotización solo se puede aceptar una vez (409 si ya está decidida).
  if (!transicionValida('cotizacion', cotizacion.estado, 'Aceptada')) {
    return res.status(409).json({
      ok: false,
      mensaje: `Transición inválida de "estado": ${cotizacion.estado} → Aceptada`,
    });
  }

  // Exonerada (SENA verificado) pasa a Pagada; el externo queda a la espera del cupón.
  const destino = cotizacion.exonerada ? 'Pagada' : 'Pendiente de pago';
  if (!transicionValida('solicitud', solicitud.estado, destino)) {
    return res.status(409).json({
      ok: false,
      mensaje: `Transición inválida de "estado": ${solicitud.estado} → ${destino}`,
    });
  }

  // Firma digital: imagen del canvas + términos + nombre y documento (RF-13).
  const firmaImagen = await guardarFirma(req.body.firmaImagen, String(cotizacion._id));
  const autorizacion = {
    nombreFirmante: req.body.nombreFirmante,
    documentoFirmante: req.body.documentoFirmante,
    firmaImagen,
    aceptaTerminos: true,
    fechaHoraFirma: new Date(),
    ip: req.ip,
  };

  // Cupón: solo si NO está exonerada; un solo cupón y cuentas activas (RF-09).
  // La cotización se marca "Aceptada" en memoria ANTES de emitir el cupón
  // (emitirCupon exige ese estado); se persiste justo después.
  cotizacion.estado = 'Aceptada';
  try {
    const cupon = cotizacion.exonerada ? null : await emitirCupon({ cotizacion });
    await cotizacion.save();

    solicitud.estado = destino;
    solicitud.autorizacion = autorizacion;
    if (cotizacion.exonerada) solicitud.exonerada = true;
    await solicitud.save();

    res.json({ ok: true, data: cotizacion, autorizacion, cupon, solicitud });
  } catch (err) {
    // Limpieza: si falla la emisión del cupón o el guardado, la firma no
    // queda referenciada; se elimina de GridFS para no dejar huérfanos.
    await eliminar(firmaImagen).catch(() => {});
    throw err;
  }
});

const cotizaciones = {
  ...crudFactory(Cotizacion, ['solicitud', 'detalles.examen']),
  crear: crearCotizacion,
  aceptar: aceptarCotizacion,
  descargarPdf,
};

export { solicitudes, cotizaciones };
