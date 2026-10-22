import cron from 'node-cron';
import CuponPago from '../models/CuponPago.js';
import Cotizacion from '../models/Cotizacion.js';
import Muestra from '../models/Muestra.js';
import Pago from '../models/Pago.js';
import ParametroSistema from '../models/ParametroSistema.js';
import Solicitud from '../models/Solicitud.js';
import Usuario from '../models/Usuario.js';
import { notificar, notificarCorreo } from './notificaciones.service.js';

// ============================================================
// Cron de alertas de retraso (RF-32).
// Detecta muestras y cupones SIN AVANCE por más de N días
// (ParametroSistema `diasAlertaRetraso`), excluyendo rechazadas y
// canceladas, y alerta al correo de producción de centros y al cliente.
// No repite: marca `ultimaAlertaRetraso` en el documento.
// ============================================================

const leerParametro = async (clave, defecto) => {
  const parametro = await ParametroSistema.findOne({ clave });
  return parametro?.valor ?? defecto;
};

const dias = (n) => n * 24 * 60 * 60 * 1000;

// Ejecuta una pasada de detección y alerta. Devuelve el conteo de alertas.
const ejecutarAlertasRetraso = async ({ ahora = new Date() } = {}) => {
  const nDias = Number(await leerParametro('diasAlertaRetraso', '5')) || 5;
  const limite = new Date(ahora.getTime() - dias(nDias));
  const correoCentros = await leerParametro('correoProduccionCentros', '');
  const resultado = { muestras: 0, cupones: 0 };

  // ---- Muestras sin avance (no terminales) ----
  const muestras = await Muestra.find({
    etapaActual: { $nin: ['Finalizada', 'Cancelada'] },
    estado: { $ne: 'Rechazada' },
    updatedAt: { $lt: limite },
  }).populate({ path: 'solicitud', select: 'usuario codigoPresolicitud' });

  for (const muestra of muestras) {
    // No repetir si ya se alertó desde el último avance.
    if (muestra.ultimaAlertaRetraso && new Date(muestra.ultimaAlertaRetraso) >= new Date(muestra.updatedAt)) {
      continue;
    }
    const solicitud = muestra.solicitud;
    const usuario = solicitud?.usuario ? await Usuario.findById(solicitud.usuario).select('nombres correo') : null;
    const variables = {
      orden: solicitud?.codigoPresolicitud || '',
      codigoMuestra: muestra.codigoMuestra || '(sin código)',
      estado: muestra.etapaActual || '—',
      dias: nDias,
      fecha: ahora.toLocaleString('es-CO'),
    };

    if (usuario) {
      await notificar({ codigo: 'alerta-retraso-muestra', usuario, solicitud, variables });
    }
    if (correoCentros) {
      await notificarCorreo({ para: correoCentros, codigo: 'alerta-retraso-muestra', variables });
    }

    muestra.ultimaAlertaRetraso = ahora;
    await muestra.save();
    resultado.muestras += 1;
  }

  // ---- Cupones sin pago aprobado ----
  const cupones = await CuponPago.find({
    fechaEmision: { $lt: limite },
    fechaLimitePago: { $gte: ahora },
  });

  for (const cupon of cupones) {
    if (cupon.ultimaAlertaRetraso) continue; // no repetir

    const cotizacion = await Cotizacion.findById(cupon.cotizacion).select('solicitud');
    if (!cotizacion) continue;
    const solicitud = await Solicitud.findById(cotizacion.solicitud).select('usuario codigoPresolicitud estado');
    if (!solicitud || solicitud.estado !== 'Pendiente de pago') continue;

    const pagado = await Pago.findOne({ cupon: cupon._id, estado: 'Pagado' });
    if (pagado) continue;

    const usuario = solicitud.usuario ? await Usuario.findById(solicitud.usuario).select('nombres correo') : null;
    const variables = {
      orden: solicitud.codigoPresolicitud || '',
      codigoReferencia: cupon.codigoReferencia,
      dias: nDias,
      fecha: ahora.toLocaleString('es-CO'),
    };

    if (usuario) {
      await notificar({ codigo: 'alerta-retraso-cupon', usuario, solicitud, variables });
    }
    if (correoCentros) {
      await notificarCorreo({ para: correoCentros, codigo: 'alerta-retraso-cupon', variables });
    }

    cupon.ultimaAlertaRetraso = ahora;
    await cupon.save();
    resultado.cupones += 1;
  }

  return resultado;
};

// Programa el cron con la expresión de ParametroSistema (default diario 7:00).
const iniciarCron = async () => {
  if (process.env.NODE_ENV === 'test' || process.env.CRON_DESHABILITADO === 'true') return null;

  const expresion = (await leerParametro('cronAlertaRetraso', '0 7 * * *')) || '0 7 * * *';
  if (!cron.validate(expresion)) {
    console.error(`⚠️  Expresión cron inválida ("${expresion}"): no se programaron alertas`);
    return null;
  }

  const tarea = cron.schedule(expresion, () => {
    ejecutarAlertasRetraso().catch((err) =>
      console.error(`⚠️  Alertas de retraso fallaron: ${err.message}`)
    );
  });
  console.log(`⏰ Cron de alertas de retraso activo (${expresion})`);
  return tarea;
};

export { ejecutarAlertasRetraso, iniciarCron };
