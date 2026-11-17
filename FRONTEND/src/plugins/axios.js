/**
 * @fileoverview /plugins/axios.js
 * UNA sola instancia de axios para toda la aplicación.
 *
 * Responsabilidades:
 *  - baseURL desde VITE_API_URL (nunca escrita en el código),
 *  - inyectar el token JWT en cada petición,
 *  - normalizar TODOS los errores a { status, mensaje, errores[] },
 *  - cerrar la sesión y volver al login cuando el backend responde 401.
 *
 * Cadena de responsabilidad del proyecto:
 *   vista -> store (Pinia) -> services -> ESTE archivo -> backend
 *
 * Nota de adaptación a LABFICAT: la sesión vive en localStorage (store/Auth),
 * así que aquí se lee directo para no crear un import circular
 * (axios -> router -> store/Auth -> axios).
 */
import axios from 'axios'

const api = axios.create({
  // Nunca "quemar" la URL en el código: viene del .env (VITE_API_URL).
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
})

// Se ejecuta ANTES de cada petición: adjunta el token de la sesión.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let cerrandoSesion = false

// Se ejecuta al volver cada respuesta; normaliza el error para las vistas.
api.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    const data = error?.response?.data
    const status = error?.response?.status ?? 0

    const errorNormalizado = {
      status,
      // Código libre del backend (p. ej. CORREO_NO_REGISTRADO): permite que la
      // vista reaccione distinto según el caso sin Parsear el mensaje.
      codigo: data?.codigo ?? null,
      mensaje: data?.mensaje || mensajeSegunFallo(error),
      errores: Array.isArray(data?.errores)
        ? data.errores.map((e) => e.msg || e.message).filter(Boolean)
        : [],
    }

    // 401 = "no sé quién eres" (sin token o token vencido).
    if (status === 401) {
      const path = window.location.pathname
      if (!path.includes('/login') && !cerrandoSesion) {
        cerrandoSesion = true
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }

    return Promise.reject(errorNormalizado)
  }
)

/**
 * Traduce los fallos que NO traen respuesta del servidor.
 * @param {Object} error - error crudo de axios
 * @returns {string} mensaje entendible para el usuario
 */
function mensajeSegunFallo(error) {
  if (error?.code === 'ECONNABORTED') {
    return 'El servidor tardó demasiado en responder'
  }
  if (!error?.response) {
    return 'No hay conexión con el servidor'
  }
  return 'Ocurrió un error inesperado'
}

export { api }
export default api
