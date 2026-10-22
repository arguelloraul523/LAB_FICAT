import { defineStore } from 'pinia'
import { api } from 'src/boot/axios'

// ============================================================
// Dashboard del Jefe/Recepción (RF-27). Guarda los "contadores"
// (muestras por etapa, cola, pagos pendientes, alertas, recaudo).
// ============================================================

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    datos: null,
    cargando: false,
  }),

  getters: {
    muestrasPorEtapa: (s) => s.datos?.muestrasPorEtapa || {},
    cola: (s) => s.datos?.cola || { A1: 0, A2: 0 },
    pagosPendientes: (s) => s.datos?.pagosPendientes ?? 0,
    alertas: (s) => s.datos?.alertas || {},
    recaudo: (s) => s.datos?.recaudo || { total: 0, pagosAprobados: 0 },
  },

  actions: {
    async cargar() {
      this.cargando = true
      try {
        const { data } = await api.get('/reportes/dashboard')
        this.datos = data.data
        return data.data
      } finally {
        this.cargando = false
      }
    },
  },
})
