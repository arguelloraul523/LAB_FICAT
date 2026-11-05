<template>
  <div>
    <div class="text-h6 text-weight-bold q-mb-md">Recepción de muestras</div>

    <q-input v-model="codigo" outlined dense placeholder="Buscar por código de pre-solicitud (PRE-AAAA-NNNN)" class="q-mb-md" @keyup.enter="buscar">
      <template #prepend><q-icon name="search" /></template>
      <template #append>
        <q-btn flat round dense color="primary" icon="search" @click="buscar" />
      </template>
    </q-input>

    <div v-if="resultado" class="q-mb-md">
      <q-card class="card-suave q-pa-md">
        <div class="row items-center justify-between">
          <div>
            <div class="text-subtitle1 text-weight-bold">{{ resultado.solicitud?.codigoPresolicitud }}</div>
            <div class="text-caption text-grey-7">{{ resultado.solicitud?.descripcionMuestra }}</div>
          </div>
          <q-badge :color="resultado.aptaRecepcion ? 'positive' : 'negative'" text-color="white">
            {{ resultado.aptaRecepcion ? 'Apta para recepción' : 'No apta' }}
          </q-badge>
        </div>
        <div v-if="!resultado.aptaRecepcion" class="text-caption text-warning q-mt-sm">{{ resultado.motivo }}</div>
        <div v-if="resultado.aptaRecepcion" class="q-mt-sm">
          <q-btn color="primary" icon="inbox" label="Recibir muestra" no-caps @click="abrirRecibir" />
        </div>
      </q-card>
    </div>

    <!-- Diálogo recibir -->
    <q-dialog v-model="dialogo">
      <q-card style="width: 100%; max-width: 520px">
        <q-card-section>
          <div class="text-h6 text-weight-bold">Recibir muestra</div>
          <div class="text-caption text-grey-7">{{ resultado?.solicitud?.codigoPresolicitud }}</div>
        </q-card-section>
        <q-card-section>
          <q-form @submit="recibir" class="q-gutter-md">
            <q-input v-model="form.entregadoPor" label="Entregado por" outlined dense lazy-rules :rules="[val => !!val || 'Obligatorio']" />
            <q-input v-model="form.cantidadRecibida" type="number" label="Cantidad recibida" outlined dense lazy-rules :rules="[val => val != null || 'Obligatorio']" />
            <q-input v-model="form.unidadMedida" label="Unidad de medida" outlined dense lazy-rules :rules="[val => !!val || 'Obligatorio']" />
            <q-select v-model="form.estadoEmpaque" label="Estado del empaque" outlined dense :options="['Buen estado', 'Malas condiciones']" lazy-rules :rules="[val => !!val || 'Obligatorio']" />
            <q-select v-model="form.estadoInicial" label="Estado inicial" outlined dense :options="['Aceptada', 'En observación']" lazy-rules :rules="[val => !!val || 'Obligatorio']" />
            <q-input v-model="form.temperaturaRecepcion" type="number" label="Temperatura de recepción (°C, opcional)" outlined dense />
            <q-separator />
            <div class="text-subtitle2 text-weight-bold">Datos de recolección (CAT-ST-MI-F-002)</div>
            <q-input v-model="form.municipioRecoleccion" label="Municipio de recolección" outlined dense />
            <q-input v-model="form.direccionTomaMuestra" label="Dirección de toma de muestra" outlined dense />
            <q-input v-model="form.lugarTomaMuestra" label="Lugar de toma de muestra" outlined dense />
            <q-input v-model="form.recolectadaPor" label="Muestra recolectada por" outlined dense />
            <q-input v-model="form.procedimientoMuestreo" label="Procedimiento de muestreo" outlined dense />
            <q-input v-model="form.matrizMuestra" label="Matriz de la muestra" outlined dense />
            <q-input v-model="form.fechaHoraRecoleccion" type="datetime-local" label="Fecha y hora de recolección" outlined dense />
            <q-input v-model="form.itemCotizacion" label="Ítem de la cotización" outlined dense />
            <div class="row justify-end q-gutter-sm">
              <q-btn flat label="Cancelar" color="grey-7" v-close-popup no-caps />
              <q-btn type="submit" color="primary" label="Recibir" :loading="guardando" no-caps />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { api } from 'src/boot/axios'
import { mensajeError, mensajeOk } from 'src/utils/errores'

const codigo = ref('')
const resultado = ref(null)
const dialogo = ref(false)
const guardando = ref(false)

const form = reactive({
  entregadoPor: '',
  cantidadRecibida: null,
  unidadMedida: '',
  estadoEmpaque: 'Buen estado',
  estadoInicial: 'Aceptada',
  temperaturaRecepcion: null,
  municipioRecoleccion: '',
  direccionTomaMuestra: '',
  lugarTomaMuestra: '',
  recolectadaPor: '',
  procedimientoMuestreo: '',
  matrizMuestra: '',
  fechaHoraRecoleccion: '',
  itemCotizacion: '',
})

const formVacio = () => ({
  entregadoPor: '',
  cantidadRecibida: null,
  unidadMedida: '',
  estadoEmpaque: 'Buen estado',
  estadoInicial: 'Aceptada',
  temperaturaRecepcion: null,
  municipioRecoleccion: '',
  direccionTomaMuestra: '',
  lugarTomaMuestra: '',
  recolectadaPor: '',
  procedimientoMuestreo: '',
  matrizMuestra: '',
  fechaHoraRecoleccion: '',
  itemCotizacion: '',
})

async function buscar() {
  resultado.value = null
  if (!codigo.value.trim()) return
  try {
    const { data } = await api.get('/muestras/buscar', { params: { codigo: codigo.value.trim() } })
    resultado.value = data
  } catch (e) {
    mensajeError(e, 'No se encontró la solicitud')
  }
}

function abrirRecibir() {
  Object.assign(form, formVacio())
  dialogo.value = true
}

async function recibir() {
  guardando.value = true
  try {
    const payload = { solicitud: resultado.value.solicitud._id, ...form }
    // datetime-local devuelve "YYYY-MM-DDTHH:mm"; lo normalizamos a ISO completo.
    if (form.fechaHoraRecoleccion) {
      payload.fechaHoraRecoleccion = new Date(form.fechaHoraRecoleccion).toISOString()
    }
    await api.post('/muestras', payload)
    mensajeOk('Muestra recibida')
    dialogo.value = false
    resultado.value = null
    codigo.value = ''
  } catch (e) {
    mensajeError(e, 'No se pudo recibir la muestra')
  } finally {
    guardando.value = false
  }
}
</script>
