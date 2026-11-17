// ============================================================
// Reglas de validación en JavaScript para los q-input / q-select.
// No usan atributos HTML (required, pattern, type=email...).
// Cada regla devuelve true si es válida o el mensaje de error.
// ============================================================

export const obligatorio = (mensaje = 'Obligatorio') => (v) =>
  (v !== null && v !== undefined && String(v).trim() !== '') || mensaje

export const correo = (v) =>
  !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()) || 'Escribe un correo válido'

const esNumero = (v) => /^-?\d+([.,]\d+)?$/.test(String(v).trim())

export const numero = (v) => v === null || v === undefined || v === '' || esNumero(v) || 'Escribe solo números'

export const numeroObligatorio = (v) =>
  (v !== null && v !== undefined && String(v).trim() !== '' && esNumero(v)) || 'Escribe un número'

export const noNegativo = (v) => v === null || v === undefined || v === '' || Number(String(v).replace(',', '.')) >= 0 || 'Debe ser mayor o igual a 0'

// "1,5" o "1.5" -> 1.5. Vacío -> null.
export function aNumero(v) {
  if (v === null || v === undefined || String(v).trim() === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isNaN(n) ? null : n
}

export const fechaISO = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) || 'Elige una fecha'

// YYYY-MM-DD de una fecha local.
export function aFechaISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function primerDiaDelMes(d = new Date()) {
  return aFechaISO(new Date(d.getFullYear(), d.getMonth(), 1))
}
