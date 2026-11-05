// ============================================================
// Consultas de solo lectura del chatbot contra MongoDB.
//
// Catálogo: público.
// Datos personales: solo el Cliente dueño, usando los alcances de
// propiedad ya definidos por el proyecto.
// ============================================================

import CategoriaAnalisis from '../models/CategoriaAnalisis.js';
import CuentaRecaudo from '../models/CuentaRecaudo.js';
import Examen from '../models/Examen.js';
import Muestra, { AVANCE_POR_ETAPA } from '../models/Muestra.js';
import Solicitud from '../models/Solicitud.js';
import TipoMuestra from '../models/TipoMuestra.js';
import { alcances } from '../middlewares/propietario.middleware.js';
import { misPagos } from '../services/pagos.service.js';

const MAX_EXAMENES = 200;
const MAX_SOLICITUDES = 5;
const MAX_PAGOS = 5;

/**
 * @param {unknown} valor
 * @returns {string}
 */
function normalizarTexto(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {any} examen
 * @param {string} termino
 * @returns {boolean}
 */
function coincideExamen(examen, termino) {
  if (!termino) return true;
  const texto = [
    examen?.nombre,
    examen?.descripcion,
    examen?.categoria?.nombre,
    examen?.tipoMuestra?.nombre,
  ]
    .map(normalizarTexto)
    .join(' ');
  return texto.includes(termino);
}

/**
 * @param {string} [termino]
 * @returns {Promise<any[]>}
 */
async function listarExamenes(termino = '') {
  const examenes = await Examen.find({ activo: true })
    .populate('categoria', 'nombre')
    .populate('tipoMuestra', 'nombre')
    .sort({ nombre: 1 })
    .limit(MAX_EXAMENES)
    .lean();

  return examenes.filter((examen) => coincideExamen(examen, termino));
}

/** @returns {Promise<any[]>} */
async function listarCategorias() {
  return CategoriaAnalisis.find().select('nombre descripcion').sort({ nombre: 1 }).lean();
}

/** @returns {Promise<any[]>} */
async function listarTiposMuestra() {
  return TipoMuestra.find().select('nombre descripcion').sort({ nombre: 1 }).lean();
}

/** @returns {Promise<any[]>} */
async function listarCuentasRecaudo() {
  return CuentaRecaudo.find({ activa: true })
    .select('banco tipoCuenta numeroCuenta titular')
    .sort({ banco: 1 })
    .lean();
}

/**
 * Estado de las solicitudes, muestras y pagos del Cliente autenticado.
 *
 * @param {string} usuarioId
 * @returns {Promise<{solicitudes:any[], muestras:any[], pagos:any[]}>}
 */
async function estadoCliente(usuarioId) {
  const solicitudes = await Solicitud.find({ usuario: usuarioId })
    .sort({ fechaCreacion: -1 })
    .limit(MAX_SOLICITUDES)
    .populate('tipoMuestra', 'nombre')
    .populate('examenes.examen', 'nombre')
    .lean();

  const ids = solicitudes.map((solicitud) => solicitud._id);
  const muestras = ids.length
    ? await Muestra.find({ solicitud: { $in: ids } })
        .select('solicitud codigoMuestra estado etapaActual prioridad numeroTurno')
        .lean()
    : [];

  // El virtual porcentajeAvance no viaja en .lean(): se calcula con la constante.
  const muestrasConAvance = muestras.map((muestra) => ({
    ...muestra,
    porcentajeAvance: AVANCE_POR_ETAPA[muestra.etapaActual] ?? null,
  }));

  const { data: pagos } = await misPagos(await alcances.pago(usuarioId));

  return {
    solicitudes,
    muestras: muestrasConAvance,
    pagos: pagos.slice(0, MAX_PAGOS),
  };
}

export {
  listarExamenes,
  listarCategorias,
  listarTiposMuestra,
  listarCuentasRecaudo,
  estadoCliente,
};
