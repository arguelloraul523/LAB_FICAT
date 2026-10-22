import { Notify } from 'quasar'

// ============================================================
// Helpers de errores y notificaciones.
// El backend responde { ok:false, mensaje } o { ok:false, errores:[...] }.
// ============================================================

// Muestra un Notify negativo con el mensaje del backend y lo devuelve.
export function mensajeError(err, fallback = 'Ocurrió un error inesperado') {
  const data = err?.response?.data
  let mensaje = fallback
  if (data) {
    if (typeof data.mensaje === 'string' && data.mensaje) mensaje = data.mensaje
    else if (Array.isArray(data.errores) && data.errores.length) {
      mensaje = data.errores.map((e) => e.msg || e.message).filter(Boolean).join(', ')
    }
  } else if (err?.message && !err?.message.includes('timeout')) {
    mensaje = err.message
  }
  Notify.create({ type: 'negative', message: mensaje, position: 'top' })
  return mensaje
}

// Notificación de éxito.
export function mensajeOk(mensaje) {
  Notify.create({ type: 'positive', message: mensaje, position: 'top' })
}

// Notificación informativa.
export function mensajeInfo(mensaje) {
  Notify.create({ type: 'info', message: mensaje, position: 'top' })
}
