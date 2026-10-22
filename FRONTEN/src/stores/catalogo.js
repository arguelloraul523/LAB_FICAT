import { defineStore } from 'pinia'
import { api } from 'src/boot/axios'

// ============================================================
// Catálogo público (RF-05): categorías, tipos de muestra y exámenes.
// ============================================================

export const useCatalogoStore = defineStore('catalogo', {
  state: () => ({
    categorias: [],
    tiposMuestra: [],
    examenes: [],
    total: 0,
    cargando: false,
  }),

  actions: {
    async listarCategorias() {
      const { data } = await api.get('/catalogo/categorias', { params: { limite: 100 } })
      this.categorias = data.data || []
      return this.categorias
    },

    async listarTiposMuestra() {
      const { data } = await api.get('/catalogo/tipos-muestra', { params: { limite: 100 } })
      this.tiposMuestra = data.data || []
      return this.tiposMuestra
    },

    async listarExamenes(filtros = {}) {
      this.cargando = true
      try {
        const { data } = await api.get('/catalogo/examenes', { params: { limite: 50, ...filtros } })
        this.examenes = data.data || []
        this.total = data.total || this.examenes.length
        return data
      } finally {
        this.cargando = false
      }
    },
  },
})
