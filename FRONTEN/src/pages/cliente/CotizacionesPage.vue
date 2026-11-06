<template>
  <div>
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h6 text-weight-bold">Cotizaciones</div>
      <q-btn v-if="puedeCotizar" color="primary" icon="add" label="Nueva cotización" no-caps @click="abrirNueva" />
    </div>

    <q-table :rows="filas" :columns="columnas" row-key="_id" :loading="cargando" flat bordered class="card-suave">
      <template #body-cell-estado="props">
        <q-td :props="props"><q-badge :color="colorEstado(props.value)" text-color="white">{{ props.value }}</q-badge></q-td>
      </template>
      <template #body-cell-valorTotal="props">
        <q-td :props="props"><span class="text-weight-medium">{{ props.row.exonerada ? 'Exonerada ($0)' : formatoCOP(props.value) }}</span></q-td>
      </template>
      <template #body-cell-acciones="props">
        <q-td :props="props">
          <q-btn
            v-if="props.row.estado === 'Enviada'"
            color="primary"
            label="Aceptar y firmar"
            no-caps
            dense
            @click="abrirFirma(props.row)"
          />
          <q-btn v-else-if="props.row.archivoPdf" flat dense color="primary" icon="download" label="PDF" no-caps @click="descargar(props.row)" />
        </q-td>
      </template>
    </q-table>

    <!-- Diálogo de firma -->
    <q-dialog v-model="dialogo">
      <q-card style="width: 100%; max-width: 540px">
        <q-card-section>
          <div class="text-h6 text-weight-bold">Aceptar cotización</div>
          <div class="text-caption text-grey-7">{{ cotizacionSel?.numeroCotizacion }}</div>
        </q-card-section>
        <q-card-section>
          <q-form @submit="aceptar" class="q-gutter-md">
            <q-input v-model="form.nombreFirmante" label="Nombre del firmante" outlined dense lazy-rules :rules="[val => !!val || 'Obligatorio']" />
            <q-input v-model="form.documentoFirmante" label="Documento del firmante" outlined dense lazy-rules :rules="[val => !!val || 'Obligatorio']" />
            <div class="text-caption text-grey-7">Firma digital</div>
            <FirmaCanvas v-model="form.firmaImagen" />
            <q-checkbox v-model="form.aceptaTerminos" label="Acepto las condiciones del servicio descritas en la oferta (incluidos sus anexos)" />
            <div class="row justify-end q-gutter-sm">
              <q-btn flat label="Cancelar" color="grey-7" v-close-popup no-caps />
              <q-btn type="submit" color="primary" label="Firmar y aceptar" :loading="guardando" no-caps />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Diálogo: nueva cotización (Admin/Recepcionista) -->
    <q-dialog v-model="dialogoNueva">
      <q-card style="width: 100%; max-width: 560px">
        <q-card-section>
          <div class="text-h6 text-weight-bold">Nueva cotización</div>
        </q-card-section>
        <q-card-section>
          <q-form @submit="crearCotizacion" class="q-gutter-md">
            <q-select
              v-model="formNueva.solicitud"
              label="Solicitud (pre-solicitud)"
              outlined
              dense
              :options="solicitudes"
              option-label="codigoPresolicitud"
              option-value="_id"
              emit-value
              map-options
              lazy-rules
              :rules="[val => !!val || 'Obligatorio']"
              @update:model-value="onSolicitudChange"
            >
              <template #option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>
                    <q-item-label>{{ scope.opt.codigoPresolicitud }}</q-item-label>
                    <q-item-label caption>{{ scope.opt.descripcionMuestra }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>

            <div v-if="examenesSolicitud.length" class="text-caption text-grey-7">
              Análisis de la solicitud:
              <q-chip v-for="e in examenesSolicitud" :key="String(e.examen?._id || e.examen)" dense size="sm" color="primary" text-color="white">
                {{ e.examen?.nombre || '—' }}
              </q-chip>
            </div>
            <div v-else-if="formNueva.solicitud" class="text-caption text-warning">
              Esta solicitud no tiene análisis seleccionados.
            </div>

            <q-input
              v-model="formNueva.cantidad"
              type="number"
              min="1"
              label="Cantidad de muestras por análisis"
              outlined
              dense
              lazy-rules
              :rules="[val => val >= 1 || 'Mínimo 1']"
            />

            <div class="row justify-end q-gutter-sm">
              <q-btn flat label="Cancelar" color="grey-7" v-close-popup no-caps />
              <q-btn type="submit" color="primary" label="Generar cotización" :loading="guardando" no-caps />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from 'src/boot/axios'
import { mensajeError, mensajeOk } from 'src/utils/errores'
import { useAuthStore } from 'src/stores/auth'
import FirmaCanvas from 'src/components/FirmaCanvas.vue'

const auth = useAuthStore()
const puedeCotizar = computed(() => auth.tieneRol(['Administrador']))

const filas = ref([])
const cargando = ref(false)
const guardando = ref(false)
const dialogo = ref(false)
const cotizacionSel = ref(null)
const dialogoNueva = ref(false)
const solicitudes = ref([])
const examenesSolicitud = ref([])
const formNueva = reactive({ solicitud: null, cantidad: 1 })

const columnas = [
  { name: 'numeroCotizacion', label: 'Número', field: 'numeroCotizacion', align: 'left' },
  { name: 'valorTotal', label: 'Valor', field: 'valorTotal', align: 'left' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'left' },
  { name: 'acciones', label: 'Acciones', field: '', align: 'left' },
]

const form = reactive({ nombreFirmante: '', documentoFirmante: '', firmaImagen: '', aceptaTerminos: false })

function formatoCOP(v) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0)
}

function colorEstado(estado) {
  return { Enviada: 'info', Aceptada: 'positive', 'No aceptada': 'negative' }[estado] || 'grey-7'
}

async function cargar() {
  cargando.value = true
  try {
    const { data } = await api.get('/cotizaciones')
    filas.value = data.data || []
  } catch (e) {
    mensajeError(e, 'No se pudieron cargar las cotizaciones')
  } finally {
    cargando.value = false
  }
}

function abrirFirma(cot) {
  cotizacionSel.value = cot
  Object.assign(form, { nombreFirmante: '', documentoFirmante: '', firmaImagen: '', aceptaTerminos: false })
  dialogo.value = true
}

async function aceptar() {
  if (!form.firmaImagen) {
    mensajeError({ response: { data: { mensaje: 'Debes dibujar tu firma' } } })
    return
  }
  guardando.value = true
  try {
    await api.post(`/cotizaciones/${cotizacionSel.value._id}/aceptar`, { ...form })
    mensajeOk('Cotización aceptada')
    dialogo.value = false
    await cargar()
  } catch (e) {
    mensajeError(e, 'No se pudo aceptar la cotización')
  } finally {
    guardando.value = false
  }
}

async function descargar(cot) {
  try {
    const res = await api.get(`/cotizaciones/${cot._id}/pdf`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `${cot.numeroCotizacion}.pdf`
    a.click()
    window.URL.revokeObjectURL(url)
  } catch (e) {
    mensajeError(e, 'No se pudo descargar el PDF')
  }
}

// ===== Nueva cotización (Admin/Recepcionista) =====
async function abrirNueva() {
  dialogoNueva.value = true
  if (!solicitudes.value.length) {
    try {
      const { data } = await api.get('/solicitudes')
      // Solo se cotizan solicitudes en estado inicial (Pre-solicitud).
      solicitudes.value = (data.data || []).filter((s) => s.estado === 'Pre-solicitud')
    } catch (e) {
      mensajeError(e, 'No se pudieron cargar las solicitudes')
    }
  }
}

function onSolicitudChange(id) {
  const sol = solicitudes.value.find((s) => s._id === id)
  examenesSolicitud.value = sol?.examenes || []
}

async function crearCotizacion() {
  if (!formNueva.solicitud) return
  if (!examenesSolicitud.value.length) {
    mensajeError({ response: { data: { mensaje: 'La solicitud no tiene análisis para cotizar' } } })
    return
  }
  guardando.value = true
  try {
    const examenes = examenesSolicitud.value.map((e) => ({
      examen: e.examen?._id || e.examen,
      cantidadMuestras: Number(formNueva.cantidad) || 1,
    }))
    await api.post('/cotizaciones', { solicitud: formNueva.solicitud, examenes })
    mensajeOk('Cotización generada')
    dialogoNueva.value = false
    Object.assign(formNueva, { solicitud: null, cantidad: 1 })
    examenesSolicitud.value = []
    await cargar()
  } catch (e) {
    mensajeError(e, 'No se pudo generar la cotización')
  } finally {
    guardando.value = false
  }
}

onMounted(cargar)
</script>
