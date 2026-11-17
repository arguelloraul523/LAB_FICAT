import { defineStore } from 'pinia'
import { get, put } from '@/services/api.service'

// ============================================================
// Notificaciones del usuario (campana del encabezado, RF-14).
// GET /notificaciones (solo las propias) · PUT /notificaciones/:id
// ============================================================

export const useNotificacionesStore = defineStore('notificaciones', {
  state: () => ({
    lista: [],
    cargando: false,
  }),

  getters: {
    noLeidas: (s) => s.lista.filter((n) => !n.leida).length,
    recientes: (s) =>
      [...s.lista]
        .sort((a, b) => new Date(b.fechaEnvio || b.createdAt) - new Date(a.fechaEnvio || a.createdAt))
        .slice(0, 5),
  },

  actions: {
    async cargar() {
      this.cargando = true
      try {
        const data = await get('/notificaciones')
        this.lista = data.data || []
      } finally {
        this.cargando = false
      }
    },

    async marcarLeida(id) {
      const n = this.lista.find((x) => x._id === id)
      if (!n || n.leida) return
      n.leida = true
      try {
        await put(`/notificaciones/${id}`, { leida: true })
      } catch {
        n.leida = false
      }
    },
  },
})
