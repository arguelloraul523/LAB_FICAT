<template>
  <div>
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h6 text-weight-bold">Solicitudes</div>
      <q-btn color="primary" icon="add" label="Nueva pre-solicitud" no-caps @click="abrir" />
    </div>

    <q-table
      :rows="filas"
      :columns="columnas"
      row-key="_id"
      :loading="cargando"
      flat
      bordered
      class="card-suave"
    >
      <template #body-cell-estado="props">
        <q-td :props="props">
          <q-badge :color="colorEstado(props.value)" text-color="white">{{ props.value }}</q-badge>
        </q-td>
      </template>
      <template #body-cell-codigoPresolicitud="props">
        <q-td :props="props"><span class="text-weight-medium">{{ props.value }}</span></q-td>
      </template>
    </q-table>

    <!-- Diálogo: nueva pre-solicitud -->
    <q-dialog v-model="dialogo">
      <q-card style="width: 100%; max-width: 560px">
        <q-card-section>
          <div class="text-h6 text-weight-bold">Nueva pre-solicitud</div>
        </q-card-section>
        <q-card-section>
          <q-form @submit="crear" class="q-gutter-md">
            <q-select v-model="form.tipoMuestra" label="Tipo de muestra / matriz" outlined dense :options="tipos" option-label="nombre" option-value="_id" emit-value map-options lazy-rules :rules="[val => !!val || 'Obligatorio']" />
            <q-input v-model="form.descripcionMuestra" label="Descripción de la muestra" outlined dense lazy-rules :rules="[val => !!val || 'Obligatorio']" />
            <q-select v-model="form.origen" label="Origen" outlined dense :options="['Rural', 'Industrial', 'Doméstico']" lazy-rules :rules="[val => !!val || 'Obligatorio']" />
            <q-input v-model="form.cantidadEstimada" label="Cantidad estimada disponible" outlined dense lazy-rules :rules="[val => !!val || 'Obligatorio']" />
            <q-select v-model="form.examenes" label="Análisis de interés (opcional)" outlined dense multiple use-chips :options="examenes" option-label="nombre" option-value="_id" emit-value map-options />
            <div class="row justify-end q-gutter-sm">
              <q-btn flat label="Cancelar" color="grey-7" v-close-popup no-caps />
              <q-btn type="submit" color="primary" label="Enviar" :loading="guardando" no-caps />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { api } from 'src/boot/axios'
import { useCatalogoStore } from 'src/stores/catalogo'
import { mensajeError, mensajeOk } from 'src/utils/errores'

const catalogo = useCatalogoStore()
const cargando = ref(false)
const guardando = ref(false)
const dialogo = ref(false)
const filas = ref([])
const tipos = ref([])
const examenes = ref([])

const columnas = [
  { name: 'codigoPresolicitud', label: 'Código', field: 'codigoPresolicitud', align: 'left', sortable: true },
  { name: 'descripcionMuestra', label: 'Muestra', field: 'descripcionMuestra', align: 'left' },
  { name: 'origen', label: 'Origen', field: 'origen', align: 'left' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'left' },
  { name: 'fechaCreacion', label: 'Fecha', field: 'fechaCreacion', align: 'left', format: (v) => new Date(v).toLocaleDateString('es-CO') },
]

const form = reactive({
  tipoMuestra: null,
  descripcionMuestra: '',
  origen: 'Rural',
  cantidadEstimada: '',
  examenes: [],
})

function colorEstado(estado) {
  const map = {
    'Pre-solicitud': 'grey-7',
    Cotizada: 'info',
    'Pendiente de pago': 'warning',
    Pagada: 'primary',
    'En proceso': 'secondary',
    Finalizada: 'positive',
    Cancelada: 'negative',
    'No aceptada': 'negative',
  }
  return map[estado] || 'grey-7'
}

async function cargar() {
  cargando.value = true
  try {
    const { data } = await api.get('/solicitudes')
    filas.value = data.data || []
  } catch (e) {
    mensajeError(e, 'No se pudieron cargar las solicitudes')
  } finally {
    cargando.value = false
  }
}

async function abrir() {
  try {
    if (!tipos.value.length) tipos.value = await catalogo.listarTiposMuestra()
    if (!examenes.value.length) examenes.value = await catalogo.listarExamenes({ limite: 50 })
    dialogo.value = true
  } catch (e) {
    mensajeError(e, 'No se pudo cargar el catálogo')
  }
}

async function crear() {
  guardando.value = true
  try {
    await api.post('/solicitudes', form)
    mensajeOk('Pre-solicitud creada')
    dialogo.value = false
    Object.assign(form, { tipoMuestra: null, descripcionMuestra: '', origen: 'Rural', cantidadEstimada: '', examenes: [] })
    await cargar()
  } catch (e) {
    mensajeError(e, 'No se pudo crear la solicitud')
  } finally {
    guardando.value = false
  }
}

onMounted(cargar)
</script>
