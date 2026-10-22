<template>
  <div>
    <div class="text-h6 text-weight-bold q-mb-md">Reportes gerenciales</div>

    <div class="row q-col-gutter-md q-mb-md items-end">
      <q-input v-model="desde" type="date" label="Desde" outlined dense class="col-6 col-md-3" />
      <q-input v-model="hasta" type="date" label="Hasta" outlined dense class="col-6 col-md-3" />
      <div class="col-12 col-md-6">
        <q-btn color="primary" icon="refresh" label="Consultar" no-caps class="q-mr-sm" @click="consultar" />
        <q-btn color="secondary" icon="download" label="CSV" no-caps class="q-mr-sm" @click="descargar('csv')" />
        <q-btn color="secondary" icon="download" label="Excel" no-caps class="q-mr-sm" @click="descargar('xlsx')" />
        <q-btn color="secondary" icon="download" label="PDF" no-caps @click="descargar('pdf')" />
      </div>
    </div>

    <div v-if="resumen" class="row q-col-gutter-md">
      <q-card v-for="m in metricas" :key="m.clave" class="col-6 col-md-3 card-suave">
        <q-card-section>
          <div class="text-caption text-grey-7">{{ m.label }}</div>
          <div class="text-h5 text-weight-bold text-sena">{{ m.formato ? m.formato(resumen[m.clave]) : resumen[m.clave] }}</div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { api } from 'src/boot/axios'
import { mensajeError } from 'src/utils/errores'

const desde = ref('')
const hasta = ref('')
const resumen = ref(null)

const cop = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0)

const metricas = [
  { clave: 'volumenMuestras', label: 'Volumen de muestras' },
  { clave: 'rechazadas', label: 'Muestras rechazadas' },
  { clave: 'porcentajeRechazadas', label: '% rechazadas', formato: (v) => `${v}%` },
  { clave: 'facturadoExternos', label: 'Facturado a externos', formato: cop },
  { clave: 'exoneradoSena', label: 'Exonerado SENA', formato: cop },
]

async function consultar() {
  try {
    const { data } = await api.get('/reportes', { params: { desde: desde.value || undefined, hasta: hasta.value || undefined } })
    resumen.value = data.data
  } catch (e) {
    mensajeError(e, 'No se pudo consultar el reporte')
  }
}

async function descargar(formato) {
  try {
    const res = await api.get('/reportes', {
      params: { desde: desde.value || undefined, hasta: hasta.value || undefined, formato },
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte.${formato}`
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (e) {
    mensajeError(e, 'No se pudo descargar el reporte')
  }
}

consultar()
</script>
