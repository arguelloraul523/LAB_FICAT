<template>
  <div>
    <EncabezadoPagina titulo="Cola de atención del día" icono="format_list_numbered">
      <template #acciones>
        <q-btn flat color="primary" icon="refresh" label="Actualizar" no-caps @click="cargar" />
      </template>
    </EncabezadoPagina>

    <q-banner v-if="enAtencion" class="bg-primary text-white q-mb-md" rounded>
      <b>En atención:</b> {{ enAtencion.codigoMuestra }} (prioridad {{ enAtencion.prioridad }}, turno {{ enAtencion.numeroTurno }})
    </q-banner>

    <TablaDatos :filas="filas" :columnas="columnas" :cargando="cargando" mensaje-vacio="La cola est� vac�a">
      <template #body-cell-prioridad="props">
        <q-td :props="props"><span :class="props.value === 'A1' ? 'prioridad-a1' : 'prioridad-a2'">{{ props.value }}</span></q-td>
      </template>
      <template #body-cell-estado="props">
        <q-td :props="props"><q-badge color="primary" text-color="white">{{ props.value }}</q-badge></q-td>
      </template>
    </TablaDatos>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import EncabezadoPagina from '@/components/Encabezados/EncabezadoPagina.vue'
import TablaDatos from '@/components/Tables/TablaDatos.vue'
import { get } from '@/services/api.service'
import { useNotificar } from '@/composables/useNotificar'

const { notificarOk, notificarError, notificarInfo, validacionFallida } = useNotificar()

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
    const data = await get('/muestras/cola')
    filas.value = data.data || []
    enAtencion.value = data.enAtencion || null
  } catch (e) {
    notificarError(e, 'No se pudo cargar la cola')
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
</script>