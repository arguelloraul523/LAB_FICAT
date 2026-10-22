<template>
  <div>
    <div class="text-h6 text-weight-bold q-mb-md">Mis muestras</div>

    <q-table :rows="filas" :columns="columnas" row-key="_id" :loading="cargando" flat bordered class="card-suave">
      <template #body-cell-codigoMuestra="props">
        <q-td :props="props">
          <span class="text-weight-bold">{{ props.value || '—' }}</span>
        </q-td>
      </template>
      <template #body-cell-prioridad="props">
        <q-td :props="props">
          <span :class="props.value === 'A1' ? 'prioridad-a1' : 'prioridad-a2'">{{ props.value }}</span>
        </q-td>
      </template>
      <template #body-cell-estado="props">
        <q-td :props="props"><q-badge :color="colorEstado(props.value)" text-color="white">{{ props.value }}</q-badge></q-td>
      </template>
      <template #body-cell-avance="props">
        <q-td :props="props">
          <q-linear-progress v-if="props.row.porcentajeAvance != null" :value="props.row.porcentajeAvance / 100" color="primary" rounded class="q-mt-xs" />
          <span class="text-caption text-grey-7">{{ props.row.porcentajeAvance != null ? props.row.porcentajeAvance + '%' : '—' }}</span>
        </q-td>
      </template>
    </q-table>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { api } from 'src/boot/axios'
import { mensajeError } from 'src/utils/errores'

const filas = ref([])
const cargando = ref(false)

const columnas = [
  { name: 'codigoMuestra', label: 'Código', field: 'codigoMuestra', align: 'left' },
  { name: 'prioridad', label: 'Prioridad', field: 'prioridad', align: 'left' },
  { name: 'numeroTurno', label: 'Turno', field: 'numeroTurno', align: 'left' },
  { name: 'etapaActual', label: 'Etapa', field: 'etapaActual', align: 'left' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'left' },
  { name: 'avance', label: 'Avance', field: '', align: 'left' },
]

function colorEstado(estado) {
  return { Aceptada: 'primary', 'En observación': 'warning', Rechazada: 'negative', Recibida: 'info' }[estado] || 'grey-7'
}

async function cargar() {
  cargando.value = true
  try {
    const { data } = await api.get('/muestras')
    filas.value = data.data || []
  } catch (e) {
    mensajeError(e, 'No se pudieron cargar las muestras')
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
</script>
