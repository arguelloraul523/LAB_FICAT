// ============================================================
// Formatos compartidos (moneda, fechas, tiempos de espera).
// ============================================================

export function formatoCOP(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor || 0)
}

// Fecha corta dd/mm/aaaa. Devuelve "—" si el valor no es una fecha válida.
export function formatDate(fecha) {
  if (!fecha) return '—'
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

// Tiempo transcurrido: "5 h", "3 d", "20 min". Devuelve también los días enteros.
export function tiempoDesde(fecha, ahora = Date.now()) {
  const t = new Date(fecha).getTime()
  if (!t || Number.isNaN(t)) return { texto: '—', dias: 0 }
  const min = Math.max(Math.floor((ahora - t) / 60000), 0)
  if (min < 60) return { texto: `${min} min`, dias: 0 }
  const horas = Math.floor(min / 60)
  if (horas < 24) return { texto: `${horas} h`, dias: 0 }
  const dias = Math.floor(horas / 24)
  return { texto: `${dias} d`, dias }
}

export function nombreCompleto(u) {
  if (!u || typeof u !== 'object') return ''
  return `${u.nombres || ''} ${u.apellidos || ''}`.trim()
}

export function saludo(fecha = new Date()) {
  const h = fecha.getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

// "Jueves 22 de octubre · 2:40 p. m."
export function fechaLarga(fecha = new Date()) {
  const dia = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).format(fecha)
  const hora = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true }).format(fecha)
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} · ${hora}`
}

export function horaCorta(fecha) {
  return new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(fecha))
}
