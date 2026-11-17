import { defineStore } from 'pinia'
import { get, post } from '@/services/api.service'
import { useAuthStore } from '@/store/auth'
import { aFechaISO, primerDiaDelMes } from '@/utils/reglas'

// ============================================================
// Dashboard del Jefe de Laboratorio (RF-27).
//  - GET /reportes/dashboard  -> contadores operativos (Administrador)
//  - GET /reportes?desde&hasta -> métricas del mes (solo Administrador)
//  - GET /configuracion/parametros -> días para la alerta de retraso
// ============================================================

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    datos: null,
    mes: null, // resumen del mes en curso (null si el rol no tiene permiso)
    diasAlerta: 5,
    tipologias: [], // [{ label, n }] (solo Administrador)
    cargando: false,
    ejecutandoAlerta: false,
  }),

  getters: {
    cola: (s) => s.datos?.cola || { A1: 0, A2: 0 },
    enProceso() {
      return (this.cola.A1 || 0) + (this.cola.A2 || 0)
    },
    pagosPendientes: (s) => s.datos?.pagosPendientes ?? 0,
    alertas: (s) => s.datos?.alertas || {},
    recaudo: (s) => s.datos?.recaudo || { total: 0, pagosAprobados: 0 },
    facturado: (s) => s.mes?.facturadoExternos ?? 0,
    exonerado: (s) => s.mes?.exoneradoSena ?? 0,
    // Porcentajes para las barras (sobre la suma de ambos montos).
    pctFacturado() {
      const total = this.facturado + this.exonerado
      return total ? Math.round((this.facturado / total) * 100) : 0
    },
    pctExonerado() {
      const total = this.facturado + this.exonerado
      return total ? 100 - this.pctFacturado : 0
    },
  },

  actions: {
    async cargar() {
      const auth = useAuthStore()
      this.cargando = true
      try {
        const [dash, param] = await Promise.all([
          get('/reportes/dashboard'),
          get('/configuracion/parametros').catch(() => null),
        ])
        this.datos = dash.data

        const dias = param?.data?.find?.((p) => p.clave === 'diasAlertaRetraso')
        if (dias && Number(dias.valor) > 0) this.diasAlerta = Number(dias.valor)

        // Las métricas del mes solo las puede ver el Administrador (RNF-07).
        if (auth.rol === 'Administrador') {
          const data = await get('/reportes', {
            params: { desde: primerDiaDelMes(), hasta: aFechaISO() },
          })
          this.mes = data.data
        } else {
          this.mes = null
        }
      } finally {
        this.cargando = false
      }
    },

    // Clientes por tipología (RF-04): no hay endpoint de conteo, se agrupa aquí.
    async cargarTipologias() {
      const auth = useAuthStore()
      if (auth.rol !== 'Administrador') {
        this.tipologias = []
        return
      }
      const [usuarios, tipos] = await Promise.all([get('/usuarios'), get('/configuracion/tipologias')])
      const nombres = Object.fromEntries((tipos.data || []).map((t) => [t._id, t.nombre]))
      const conteo = {}
      ;(usuarios.data || []).forEach((u) => {
        const t = u.tipologia
        if (!t) return
        const nombre = typeof t === 'object' ? t.nombre : nombres[t]
        if (nombre) conteo[nombre] = (conteo[nombre] || 0) + 1
      })
      this.tipologias = Object.entries(conteo)
        .map(([label, n]) => ({ label, n }))
        .sort((a, b) => b.n - a.n)
        .slice(0, 5)
    },

    // Dispara el cron de alertas de retraso (RF-32).
    async enviarAlertas() {
      this.ejecutandoAlerta = true
      try {
        const data = await post('/configuracion/alertas/ejecutar')
        return data
      } finally {
        this.ejecutandoAlerta = false
      }
    },
  },
})
