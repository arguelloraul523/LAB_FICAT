import { defineStore } from 'pinia'
import { api } from 'src/boot/axios'
import { useAuthStore } from 'src/stores/auth'

// ============================================================
// Estado de red del asistente. La conversación visible vive en el
// componente; aquí solo se encapsula la llamada al backend.
// ============================================================

export const useChatbotStore = defineStore('chatbot', {
  state: () => ({
    cargando: false,
    ultimoError: null,
  }),

  actions: {
    async enviar(mensaje, historial = []) {
      const auth = useAuthStore()
      this.cargando = true
      this.ultimoError = null

      try {
        const { data } = await api.post('/asistente/chat', {
          mensaje,
          modo: auth.isAuthenticated ? 'autenticado' : 'publico',
          historial,
        })

        const respuesta = data?.data || data
        if (!respuesta || typeof respuesta.respuesta !== 'string') {
          throw new Error('El asistente devolvió una respuesta inválida')
        }
        return respuesta
      } catch (error) {
        this.ultimoError = error
        throw error
      } finally {
        this.cargando = false
      }
    },
  },
})
