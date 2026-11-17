// ============================================================
// Orquestador del asistente: intención → consulta MongoDB → respuesta.
// No hay proveedor de IA ni generación de texto libre.
// ============================================================

import MensajeAsistente from '../models/MensajeAsistente.js';
import * as R from './chatbot.respuestas.js';
import * as data from './chatbot.data.service.js';
import { clasificarIntencion, extraerTermino, LIMITE_MENSAJES } from './chatbot.intents.js';

/**
 * @param {unknown} mensaje
 * @returns {string}
 */
function limpiarMensaje(mensaje) {
  return String(mensaje ?? '').trim().substring(0, 2000);
}

/**
 * Persiste un turno sin bloquear ni romper la respuesta si MongoDB falla.
 *
 * @param {object|null} usuario
 * @param {'usuario'|'asistente'} rol
 * @param {string} contenido
 * @returns {Promise<string|null>}
 */
async function guardarMensaje(usuario, rol, contenido) {
  if (!usuario?._id) return null;
  try {
    const guardado = await MensajeAsistente.create({
      usuario: usuario._id,
      rol,
      contenido: contenido.substring(0, 5000),
      opcion: null,
    });
    return String(guardado._id);
  } catch (error) {
    console.error('[chatbot] No se pudo guardar el mensaje:', error?.message ?? error);
    return null;
  }
}

/**
 * @param {{intencion:string, mensaje:string, usuario:object|null}} params
 * @returns {Promise<object>}
 */
async function construirRespuesta({ intencion, mensaje, usuario }) {
  const autenticado = Boolean(usuario);
  const esCliente = usuario?.rol?.nombre === 'Cliente';

  switch (intencion) {
    case 'menu':
      return autenticado ? R.menuAutenticado(usuario) : R.menuPublico();

    case 'examenes': {
      const termino = extraerTermino(mensaje);
      const examenes = await data.listarExamenes(termino);
      if (examenes.length === 0) return R.sinResultados('exámenes', termino);
      return R.listaExamenes(examenes, termino);
    }

    case 'requisitos': {
      const termino = extraerTermino(mensaje);
      const examenes = await data.listarExamenes(termino);
      if (examenes.length === 0) return R.sinResultados('requisitos de muestra', termino);
      return R.listaRequisitos(examenes, termino);
    }

    case 'categorias': {
      const categorias = await data.listarCategorias();
      if (categorias.length === 0) return R.sinResultados('categorías');
      return R.listaCategorias(categorias);
    }

    case 'tipos_muestra': {
      const tipos = await data.listarTiposMuestra();
      if (tipos.length === 0) return R.sinResultados('tipos de muestra');
      return R.listaTiposMuestra(tipos);
    }

    case 'pago': {
      if (!autenticado) return R.pagoPublico();
      const cuentas = await data.listarCuentasRecaudo();
      if (cuentas.length === 0) {
        return R.noDisponible('No hay cuentas de recaudo activas registradas en el backend.');
      }
      return R.listaCuentas(cuentas);
    }

    case 'estado': {
      if (!autenticado) return R.loginRequerido();
      if (!esCliente) return R.estadoNoDisponible();
      const estado = await data.estadoCliente(usuario._id);
      return R.estadoCliente(estado);
    }

    case 'rechazo':
      return autenticado ? R.rechazoNoDisponible() : R.loginRequerido();

    case 'informe':
      return R.informeNoDisponible();

    case 'verificacion_sena':
      return R.verificacionSenaNoDisponible();

    case 'asesor':
      return R.asesor();

    case 'login_requerido':
      return R.loginRequerido();

    case 'despedida':
      return R.despedida();

    case 'limite':
      return R.limite();

    case 'texto_libre': {
      const termino = extraerTermino(mensaje);
      if (!termino) return R.noReconocida(autenticado);
      const examenes = await data.listarExamenes(termino);
      if (examenes.length === 0) return R.noReconocida(autenticado);
      return R.listaExamenes(examenes, termino);
    }

    default:
      return R.noReconocida(autenticado);
  }
}

/**
 * @param {Object} params
 * @param {string} params.mensaje
 * @param {object|null} [params.usuario]
 * @param {Array<{role:string,content:string}>} [params.historial]
 * @returns {Promise<object>}
 */
async function chat({ mensaje, usuario = null, historial = [] }) {
  const texto = limpiarMensaje(mensaje);
  if (!texto) {
    const error = new Error('El mensaje es obligatorio');
    error.statusCode = 400;
    throw error;
  }

  if (Array.isArray(historial) && historial.length > LIMITE_MENSAJES * 2) {
    return { ...R.limite(), mensajeId: null };
  }

  const autenticado = Boolean(usuario);
  const intencion = clasificarIntencion(texto, autenticado);

  await guardarMensaje(usuario, 'usuario', texto);

  let respuesta;
  try {
    respuesta = await construirRespuesta({ intencion, mensaje: texto, usuario });
  } catch (error) {
    console.error('[chatbot] Error consultando datos:', error?.message ?? error);
    respuesta = R.errorInterno();
  }

  const mensajeId = await guardarMensaje(usuario, 'asistente', respuesta.respuesta);

  return {
    ...respuesta,
    mensajeId,
    autenticado,
    // Compatibilidad con la respuesta anterior del asistente.
    opcion: null,
  };
}

export { chat };
