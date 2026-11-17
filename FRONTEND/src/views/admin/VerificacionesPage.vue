<template>
  <div>
    <EncabezadoPagina titulo="Verificación SENA" subtitulo="Solicitudes de identidad institucional" icono="verified" />

    <TablaDatos :filas="filas" :columnas="columnas" :cargando="cargando" mensaje-vacio="No hay verificaciones pendientes">
      <template #body-cell-estado="props">
        <q-td :props="props"><q-badge :color="colorEstado(props.value)" text-color="white">{{ props.value }}</q-badge></q-td>
      </template>
      <template #body-cell-acciones="props">
        <q-td :props="props">
          <div v-if="props.row.estado === 'Pendiente'" class="q-gutter-sm">
            <q-btn color="positive" label="Aprobar" dense no-caps @click="decidir(props.row, 'Aprobada')" />
            <q-btn color="negative" outline label="Rechazar" dense no-caps @click="decidir(props.row, 'Rechazada')" />
          </div>
        </q-td>
      </template>
    </TablaDatos>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import EncabezadoPagina from '@/components/Encabezados/EncabezadoPagina.vue'
import TablaDatos from '@/components/Tables/TablaDatos.vue'
import { get, put } from '@/services/api.service'
import { useNotificar } from '@/composables/useNotificar'

const { notificarOk, notificarError, notificarInfo, validacionFallida } = useNotificar()

const filas = ref([])
const cargando = ref(false)

const columnas = [
  { name: 'usuario', label: 'Usuario', field: (r) => r.usuario?.correo || '—', align: 'left' },
  { name: 'correoInstitucional', label: 'Correo institucional', field: 'correoInstitucional', align: 'left' },
  { name: 'numeroFicha', label: 'Ficha', field: 'numeroFicha', align: 'left' },
  { name: 'numeroContratoCedula', label: 'Contrato/Cédula', field: 'numeroContratoCedula', align: 'left' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'left' },
  { name: 'acciones', label: 'Acciones', field: '', align: 'left' },
]

function colorEstado(estado) {
  return { Pendiente: 'warning', Aprobada: 'positive', Rechazada: 'negative' }[estado] || 'grey-7'
}

async function cargar() {
  cargando.value = true
  try {
    const data = await get('/usuarios/verificaciones')
    filas.value = data.data || []
  } catch (e) {
    notificarError(e, 'No se pudieron cargar las verificaciones')
  } finally {
    cargando.value = false
  }
}

async function decidir(fila, estado) {
  try {
    await put(`/usuarios/verificaciones/${fila._id}/${estado === 'Aprobada' ? 'aprobar' : 'rechazar'}`)
    notificarOk(`Verificación ${estado}`)
    await cargar()
  } catch (e) {
    notificarError(e, 'No se pudo procesar la verificación')
  }
}

onMounted(cargar)
</script>