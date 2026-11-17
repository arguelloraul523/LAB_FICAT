import { defineStore } from 'pinia'
import { get, put } from '@/services/api.service'
import { tiempoDesde } from '@/utils/formato'

// ============================================================
// Bandeja de pagos pendientes de verificación (RF-09).
//  - GET /pagos/pendientes?limite=N (más antiguos primero)
//  - PUT /pagos/:id/verificar { aprobar, observacion }
// ============================================================

export const usePagosStore = defineStore('pagos', {
  state: () => ({
    pendientes: [],
    total: 0,
    cargando: false,
    verificando: false,
  }),

  getters: {
    filas: (s) =>
      s.pendientes.map((p) => {
        const cupon = p.cupon || {}
        const solicitud = cupon.cotizacion?.solicitud || {}
        return {
          id: p._id,
          referencia: solicitud.codigoPresolicitud || cupon.codigoReferencia || 'Sin referencia',
          metodo: p.metodo,
          valor: p.valorReportado,
          hace: tiempoDesde(p.fechaCarga).texto,
          fechaPago: p.fechaPagoReportada,
          recibo: p.numeroReciboCaja || '',
        }
      }),
  },

  actions: {
    async cargarPendientes(limite = 4) {
      this.cargando = true
      try {
        const data = await get('/pagos/pendientes', { params: { pagina: 1, limite } })
        this.pendientes = data.data || []
        this.total = data.total ?? this.pendientes.length
      } finally {
        this.cargando = false
      }
    },

    async verificar(id, aprobar, observacion = '') {
      this.verificando = true
      try {
        const data = await put(`/pagos/${id}/verificar`, { aprobar, observacion })
        return data
      } finally {
        this.verificando = false
      }
    },
  },
})
