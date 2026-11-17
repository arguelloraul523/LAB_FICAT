import { defineStore } from 'pinia'
import { get } from '@/services/api.service'
import { horaCorta, nombreCompleto } from '@/utils/formato'

// ============================================================
// Registro auditable de muestras (RF-24). Solo lectura.
// GET /muestras/historial (muestra y usuario vienen poblados).
// ============================================================

export const useHistorialStore = defineStore('historial', {
  state: () => ({
    eventos: [],
    cargando: false,
  }),

  getters: {
    recientes: (s) =>
      [...s.eventos]
        .sort((a, b) => new Date(b.fechaHora || b.createdAt) - new Date(a.fechaHora || a.createdAt))
        .slice(0, 5)
        .map((e) => ({
          id: e._id,
          hora: horaCorta(e.fechaHora || e.createdAt),
          texto: `${e.accion}${e.muestra?.codigoMuestra ? ' · ' + e.muestra.codigoMuestra : ''}`,
          detalle: e.comentario || (e.valorNuevo ? `→ ${e.valorNuevo}` : ''),
          quien: nombreCompleto(e.usuario) || 'sistema',
        })),
  },

  actions: {
    async cargar() {
      this.cargando = true
      try {
        const data = await get('/muestras/historial')
        this.eventos = data.data || []
      } finally {
        this.cargando = false
      }
    },
  },
})
