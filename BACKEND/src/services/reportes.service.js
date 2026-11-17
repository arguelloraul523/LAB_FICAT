import Cotizacion from '../models/Cotizacion.js';
import CuponPago from '../models/CuponPago.js';
import Muestra from '../models/Muestra.js';
import Notificacion from '../models/Notificacion.js';
import Pago from '../models/Pago.js';
import ParametroSistema from '../models/ParametroSistema.js';
import Rechazo from '../models/Rechazo.js';

// ============================================================
// Reportes y dashboard (RF-27, RF-30).
// Cálculos con agregaciones de Mongo; sin lógica de presentación.
// ============================================================

const rangoFecha = (desde, hasta) => {
  const filtro = {};
  if (desde) filtro.$gte = new Date(desde);
  if (hasta) filtro.$lte = new Date(hasta);
  return Object.keys(filtro).length ? filtro : null;
};

const sumar = (resultado) => (resultado.length ? resultado[0].total : 0);

// Reporte por rango: volumen, rechazo, facturado a externos y exonerado SENA.
const resumenReporte = async ({ desde, hasta } = {}) => {
  const rango = rangoFecha(desde, hasta);

  const filtroMuestra = rango ? { fechaIngreso: rango } : {};
  const filtroRechazo = rango ? { fechaRechazo: rango } : {};
  const filtroCotizacion = rango ? { fechaEmision: rango } : {};

  const [volumenMuestras, rechazadas, facturado, exonerado] = await Promise.all([
    Muestra.countDocuments(filtroMuestra),
    Rechazo.countDocuments(filtroRechazo),
    Cotizacion.aggregate([
      { $match: { ...filtroCotizacion, exonerada: false, estado: 'Aceptada' } },
      { $group: { _id: null, total: { $sum: '$valorTotal' } } },
    ]),
    Cotizacion.aggregate([
      { $match: { ...filtroCotizacion, exonerada: true } },
      { $group: { _id: null, total: { $sum: '$valorTotal' } } },
    ]),
  ]);

  const porcentajeRechazadas = volumenMuestras
    ? Number(((rechazadas / volumenMuestras) * 100).toFixed(2))
    : 0;

  return {
    desde: desde || null,
    hasta: hasta || null,
    volumenMuestras,
    rechazadas,
    porcentajeRechazadas,
    facturadoExternos: sumar(facturado),
    exoneradoSena: sumar(exonerado),
  };
};

// Dashboard del Jefe/Recepción: panorama operativo y financiero del laboratorio.
const dashboardReporte = async () => {
  const parametro = await ParametroSistema.findOne({ clave: 'diasAlertaRetraso' });
  const dias = Number(parametro?.valor) || 5;
  const limite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  const ahora = new Date();

  const [porEtapa, abiertas, pagosPendientes, pagados, muestrasRetrasadas, cuponesRetrasados, noLeidas] =
    await Promise.all([
      Muestra.aggregate([{ $group: { _id: '$etapaActual', total: { $sum: 1 } } }]),
      Muestra.aggregate([
        {
          $match: {
            etapaActual: { $nin: ['Finalizada', 'Cancelada'] },
            estado: { $ne: 'Rechazada' },
          },
        },
        { $group: { _id: '$prioridad', total: { $sum: 1 } } },
      ]),
      Pago.countDocuments({ estado: 'Pendiente de verificación' }),
      Pago.aggregate([
        { $match: { estado: 'Pagado' } },
        { $group: { _id: null, total: { $sum: '$valorReportado' }, n: { $sum: 1 } } },
      ]),
      Muestra.countDocuments({
        etapaActual: { $nin: ['Finalizada', 'Cancelada'] },
        estado: { $ne: 'Rechazada' },
        updatedAt: { $lt: limite },
      }),
      CuponPago.countDocuments({ fechaEmision: { $lt: limite }, fechaLimitePago: { $gte: ahora } }),
      Notificacion.countDocuments({ leida: false }),
    ]);

  const muestrasPorEtapa = {};
  porEtapa.forEach((e) => {
    muestrasPorEtapa[e._id || 'Sin etapa'] = e.total;
  });

  const cola = { A1: 0, A2: 0 };
  abiertas.forEach((a) => {
    if (a._id) cola[a._id] = a.total;
  });

  return {
    generadoEn: ahora,
    muestrasPorEtapa,
    cola,
    pagosPendientes,
    alertas: { muestrasRetrasadas, cuponesRetrasados, notificacionesNoLeidas: noLeidas },
    recaudo: { total: pagados.length ? pagados[0].total : 0, pagosAprobados: pagados.length ? pagados[0].n : 0 },
  };
};

export { resumenReporte, dashboardReporte };
