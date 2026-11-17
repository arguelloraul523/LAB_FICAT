<template>
  <div>
    <EncabezadoPagina titulo="Reportes" subtitulo="Consulta métricas por rango de fechas y expórtalas" icono="bar_chart" />

    <q-card flat bordered class="card-suave q-mb-lg">
      <q-card-section>
        <q-form novalidate class="row q-col-gutter-md items-start" @submit.prevent="consultar" @validation-error="validacionFallida">
          <div class="col-12 col-sm-4 col-md-3"><FechaInput v-model="desde" label="Desde" /></div>
          <div class="col-12 col-sm-4 col-md-3"><FechaInput v-model="hasta" label="Hasta" /></div>
          <div class="col-12 col-sm-4 col-md-auto">
            <q-btn type="submit" unelevated color="primary" no-caps icon="search" label="Consultar" :loading="rep.cargando" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>

    <div class="indicadores q-mb-lg">
      <div v-for="i in indicadores" :key="i.titulo" class="indicador">
        <div class="ind-label">{{ i.titulo }}</div>
        <div class="ind-valor">{{ i.valor }}</div>
      </div>
    </div>

    <q-card flat bordered class="card-suave q-mb-lg">
      <q-card-section>
        <div class="text-h6 text-weight-bold text-secondary">Exportar</div>
        <div class="q-gutter-sm q-mt-sm">
          <q-btn outline color="secondary" no-caps icon="grid_on" label="Excel" :loading="rep.exportando" @click="exportar('xlsx')" />
          <q-btn outline color="secondary" no-caps icon="picture_as_pdf" label="PDF" :loading="rep.exportando" @click="exportar('pdf')" />
          <q-btn outline color="secondary" no-caps icon="description" label="CSV" :loading="rep.exportando" @click="exportar('csv')" />
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered class="card-suave">
      <q-card-section class="row items-center">
        <div>
          <div class="text-h6 text-weight-bold text-secondary">Muestras recibidas</div>
          <div class="text-caption text-grey-7">Últimos 14 días</div>
        </div>
        <q-space />
        <div class="leyenda">
          <span><i style="background: #39a900" /> A1 · SENA</span>
          <span><i style="background: #00324d" /> A2 · Externos</span>
        </div>
      </q-card-section>
      <q-card-section>
        <div v-if="!hayDatos && !rep.cargandoSerie" class="text-grey-7 q-pa-md">No hay muestras en los últimos 14 días.</div>
        <div v-else class="grafico" role="img" aria-label="Muestras recibidas por día">
          <div v-for="d in rep.serie" :key="d.clave" class="col-dia" :title="`${d.clave}: A1 ${d.a1}, A2 ${d.a2}`">
            <div class="pila">
              <div class="seg seg-a2" :style="{ height: alto(d.a2) }" />
              <div class="seg seg-a1" :style="{ height: alto(d.a1) }" />
            </div>
            <div class="dia mono">{{ d.etiqueta }}</div>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import EncabezadoPagina from '@/components/Encabezados/EncabezadoPagina.vue'
import FechaInput from '@/components/Forms/FechaInput.vue'
import { useReportesStore } from '@/store/reportes'
import { aFechaISO, primerDiaDelMes } from '@/utils/reglas'
import { formatoCOP } from '@/utils/formato'
import { useNotificar } from '@/composables/useNotificar'

const { notificarOk, notificarError, notificarInfo, validacionFallida } = useNotificar()

const rep = useReportesStore()
const desde = ref(primerDiaDelMes())
const hasta = ref(aFechaISO())

function rangoValido() {
  if (desde.value > hasta.value) {
    notificarError('La fecha "Hasta" debe ser igual o posterior a "Desde".')
    return false
  }
  return true
}

async function consultar() {
  if (!rangoValido()) return
  try {
    await rep.consultar({ desde: desde.value, hasta: hasta.value })
  } catch (e) {
    notificarError(e, 'No se pudo consultar el reporte')
  }
}

async function exportar(formato) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde.value) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta.value)) {
    notificarError('Completa las fechas antes de exportar.')
    return
  }
  if (!rangoValido()) return
  try {
    await rep.exportar({ desde: desde.value, hasta: hasta.value, formato })
  } catch (e) {
    notificarError(e, 'No se pudo exportar el reporte')
  }
}

const indicadores = computed(() => {
  const r = rep.resumen || {}
  const num = (v) => (v === undefined || v === null ? '—' : v)
  const cop = (v) => (v === undefined || v === null ? '—' : formatoCOP(v))
  return [
    { titulo: 'Muestras recibidas', valor: num(r.muestrasRecibidas) },
    { titulo: 'Muestras finalizadas', valor: num(r.muestrasFinalizadas) },
    { titulo: 'Facturado a externos', valor: cop(r.facturadoExternos) },
    { titulo: 'Exonerado SENA', valor: cop(r.exoneradoSena) },
    { titulo: 'Recaudo', valor: cop(r.recaudo?.total ?? r.recaudo) },
  ]
})

const maximo = computed(() => Math.max(1, ...rep.serie.map((d) => d.a1 + d.a2)))
const hayDatos = computed(() => rep.serie.some((d) => d.a1 + d.a2 > 0))
const alto = (n) => `${(n / maximo.value) * 100}%`

onMounted(async () => {
  try {
    await Promise.all([rep.consultar({ desde: desde.value, hasta: hasta.value }), rep.cargarSerie()])
  } catch (e) {
    notificarError(e, 'No se pudieron cargar los reportes')
  }
})
</script>

<style scoped>
.titulo { font-size: 30px; font-weight: 800; color: #00324d; margin: 0 0 4px; }
.indicadores { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 16px; }
.indicador { background: #fff; border: 1px solid #e3e9ef; border-radius: 20px; padding: 18px 20px; }
.ind-label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
.ind-valor { font-size: 26px; font-weight: 800; color: #00324d; font-family: 'JetBrains Mono', monospace; margin-top: 6px; }

.leyenda { display: flex; gap: 16px; font-size: 13px; color: #475569; }
.leyenda i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; }

.grafico { display: flex; align-items: flex-end; gap: 8px; height: 220px; }
.col-dia { flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; min-width: 0; }
.pila { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; }
.seg { width: 100%; }
.seg-a1 { background: #39a900; }
.seg-a2 { background: #00324d; border-radius: 4px 4px 0 0; }
.dia { text-align: center; font-size: 11px; color: #64748b; margin-top: 6px; }
</style>