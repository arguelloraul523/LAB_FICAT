import { defineStore } from 'pinia'
import { get } from '@/services/api.service'
import { nombreCompleto, tiempoDesde } from '@/utils/formato'

// ============================================================
// Cola de turnos (RF-18, RF-19, RNF-08).
// GET /muestras devuelve, para el Administrador, la muestra con
// analista y exámenes poblados. Aquí se filtra el ciclo abierto y
// se ordena A1 antes que A2 y luego por número de turno.
// El cliente NUNCA se muestra (código ciego).
// ============================================================

let temporizador = null

export const useTurnosStore = defineStore('turnos', {
  state: () => ({
    muestras: [],
    cargando: false,
    primeraCarga: true,
    actualizado: null,
  }),

  getters: {
    cola: (s) =>
      s.muestras
        .filter((m) => !['Finalizada', 'Cancelada'].includes(m.etapaActual) && m.estado !== 'Rechazada')
        .sort((a, b) => {
          const p = String(a.prioridad || 'ZZ').localeCompare(String(b.prioridad || 'ZZ'))
          return p !== 0 ? p : (a.numeroTurno || 0) - (b.numeroTurno || 0)
        }),
  },

  actions: {
    filas(diasAlerta = 5) {
      return this.cola.map((m, i) => {
        const espera = tiempoDesde(m.updatedAt || m.fechaIngreso)
        const examenes = (m.examenes || []).map((e) => e.examen?.nombre).filter(Boolean)
        return {
          id: m._id,
          orden: i + 1,
          turno: m.numeroTurno != null ? String(m.numeroTurno).padStart(2, '0') : '—',
          codigo: m.codigoMuestra || '—',
          prioridad: m.prioridad || 'A2',
          ensayo: examenes.length ? examenes[0] + (examenes.length > 1 ? ` +${examenes.length - 1}` : '') : 'Sin ensayo',
          analista: nombreCompleto(m.analista) || 'Sin asignar',
          etapa: m.etapaActual,
          espera: espera.texto,
          retrasada: espera.dias >= diasAlerta,
        }
      })
    },

    // `silencioso` evita avisos repetidos en el refresco automático.
    async cargar({ silencioso = false } = {}) {
      if (!silencioso) this.cargando = true
      try {
        const data = await get('/muestras')
        this.muestras = data.data || []
        this.actualizado = new Date()
      } finally {
        this.cargando = false
        this.primeraCarga = false
      }
    },

    // Refresco corto (RNF-08): solo mientras la pestaña está visible.
    iniciarPolling(ms = 10000) {
      this.detener()
      temporizador = setInterval(() => {
        if (document.visibilityState === 'visible') this.cargar({ silencioso: true }).catch(() => {})
      }, ms)
    },

    detener() {
      if (temporizador) clearInterval(temporizador)
      temporizador = null
    },
  },
})
