/**
 * @fileoverview /services/api.service.js
 * Las 4 funciones con las que se consume CUALQUIER endpoint del backend:
 * get, post, put y del.
 *
 * Regla del proyecto: **ningún componente ni store llama a axios directamente**.
 * Siempre se importan estas funciones:
 *
 *   import { get, post, put, del } from '@/services/api.service'
 *
 *   const lista = await get('/examenes?pagina=1&limite=20')
 *   await post('/cotizaciones', datos)
 *   await put(`/pagos/${id}/verificar`, { aprobar: true })
 *   await del(`/examenes/${id}`)
 *
 * Detalles:
 *  1. Devuelven directamente el `data` de la respuesta (el cuerpo JSON del
 *     backend), no el objeto completo de axios.
 *  2. NO llevan try/catch: el error sube a la vista o al store, que decide qué
 *     mensaje mostrar con `useNotificar`. El error ya viene normalizado como
 *     { status, mensaje, errores[] } por /plugins/axios.js.
 *  3. `del` y no `delete` porque `delete` es palabra reservada de JavaScript.
 *  4. El segundo/tercer argumento `config` es opcional y permite lo que la URL
 *     no puede expresar: `params`, `responseType: 'blob'`, cabeceras de
 *     formularios, etc. Los filtros simples van en la URL.
 */
import api from '@/plugins/axios'

/**
 * LEER datos.
 * @param {string} url - ruta relativa al backend. Ej: '/examenes'
 * @param {Object} [config] - opciones de axios (params, responseType...)
 * @returns {Promise<any>} cuerpo de la respuesta
 */
export const get = async (url, config = {}) => {
  const { data } = await api.get(url, config)
  return data
}

/**
 * CREAR un registro.
 * @param {string} url - Ej: '/cotizaciones'
 * @param {Object|FormData} [datos] - cuerpo de la petición
 * @param {Object} [config] - opciones de axios (headers de multipart...)
 * @returns {Promise<any>} cuerpo de la respuesta
 */
export const post = async (url, datos = {}, config = {}) => {
  const { data } = await api.post(url, datos, config)
  return data
}

/**
 * ACTUALIZAR un registro. El cuerpo es opcional.
 * @param {string} url - Ej: '/pagos/123/verificar'
 * @param {Object} [datos]
 * @param {Object} [config]
 * @returns {Promise<any>} cuerpo de la respuesta
 */
export const put = async (url, datos = {}, config = {}) => {
  const { data } = await api.put(url, datos, config)
  return data
}

/**
 * BORRAR un registro.
 * @param {string} url - Ej: '/examenes/123'
 * @param {Object} [config]
 * @returns {Promise<any>} cuerpo de la respuesta
 */
export const del = async (url, config = {}) => {
  const { data } = await api.delete(url, config)
  return data
}
