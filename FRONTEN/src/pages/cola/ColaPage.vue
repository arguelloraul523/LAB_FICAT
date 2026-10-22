<template>
  <div>
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h6 text-weight-bold">Cola de atención del día</div>
      <q-btn flat color="primary" icon="refresh" label="Actualizar" no-caps @click="cargar" />
    </div>

    <q-banner v-if="enAtencion" class="bg-primary text-white q-mb-md" rounded>
      <b>En atención:</b> {{ enAtencion.codigoMuestra }} (prioridad {{ enAtencion.prioridad }}, turno {{ enAtencion.numeroTurno }})
    </q-banner>

    <q-table :rows="filas" :columns="columnas" row-key="_id" :loading="cargando" flat bordered class="card-suave">
      <template #body-cell-prioridad="props">
        <q-td :props="props"><span :class="props.value === 'A1' ? 'prioridad-a1' : 'prioridad-a2'">{{ props.value }}</span></q-td>
      </template>
      <template #body-cell-estado="props">
        <q-td :props="props"><q-badge color="primary" text-color="white">{{ props.value }}</q-badge></q-td>
      </template>
    </q-table>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from 'src/boot/axios'
import { mensajeError } from 'src/utils/errores'

const filas = ref([])
const enAtencion = ref(null)
const cargando = ref(false)

const columnas = [
  { name: 'codigoMuestra', label: 'Código', field: 'codigoMuestra', align: 'left' },
  { name: 'prioridad', label: 'Prioridad', field: 'prioridad', align: 'left' },
  { name: 'numeroTurno', label: 'Turno', field: 'numeroTurno', align: 'left' },
  { name: 'etapaActual', label: 'Etapa', field: 'etapaActual', align: 'left' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'left' },
]

async function cargar() {
  cargando.value = true
  try {
    const { data } = await api.get('/muestras/cola')
    filas.value = data.data || []
    enAtencion.value = data.enAtencion || null
  } catch (e) {
    mensajeError(e, 'No se pudo cargar la cola')
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
</script>
