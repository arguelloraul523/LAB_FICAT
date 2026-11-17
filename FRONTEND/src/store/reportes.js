import { defineStore } from 'pinia'
import { get } from '@/services/api.service'
import { aFechaISO } from '@/utils/reglas'

// ============================================================
// Reportes gerenciales (RF-30).
//  - GET /reportes?desde&hasta            -> resumen (JSON)
//  - GET /reportes?...&formato=xlsx|pdf|csv -> archivo
//  - Serie "muestras recibidas" de los últimos 14 días, calculada
//    desde GET /muestras (no existe endpoint por día).
// ============================================================

const DIAS = 14

export const useReportesStore = defineStore('reportes', {
  state: () => ({
    resumen: null,
    serie: [],
    cargando: false,
    cargandoSerie: false,
    exportando: false,
  }),

  actions: {
    async consultar({ desde, hasta }) {
      this.cargando = true
      try {
        const data = await get('/reportes', { params: { desde, hasta } })
        this.resumen = data.data
        return data.data
      } finally {
        this.cargando = false
      }
    },

    async exportar({ desde, hasta, formato }) {
      this.exportando = true
      try {
        const res = await get('/reportes', { params: { desde, hasta, formato }, responseType: 'blob' })
        const url = window.URL.createObjectURL(new Blob([res]))
        const a = document.createElement('a')
        a.href = url
        a.download = `reporte-${desde}_a_${hasta}.${formato}`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      } finally {
        this.exportando = false
      }
    },

    // Agrupa fechaIngreso por día y prioridad (A1 / A2) en la ventana de 14 días.
    async cargarSerie() {
      this.cargandoSerie = true
      try {
        const data = await get('/muestras')
        const lista = data.data || []

        const dias = []
        const hoy = new Date()
        for (let i = DIAS - 1; i >= 0; i--) {
          const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i)
          dias.push({ clave: aFechaISO(d), etiqueta: String(d.getDate()), a1: 0, a2: 0 })
        }
        const porClave = Object.fromEntries(dias.map((d) => [d.clave, d]))

        lista.forEach((m) => {
          const f = new Date(m.fechaIngreso)
          if (Number.isNaN(f.getTime())) return
          const dia = porClave[aFechaISO(f)]
          if (!dia) return
          if (m.prioridad === 'A1') dia.a1 += 1
          else dia.a2 += 1
        })
        this.serie = dias
      } finally {
        this.cargandoSerie = false
      }
    },
  },
})
