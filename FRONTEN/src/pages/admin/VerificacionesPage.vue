<template>
  <div>
    <div class="text-h6 text-weight-bold q-mb-md">Verificación SENA</div>

    <q-table :rows="filas" :columns="columnas" row-key="_id" :loading="cargando" flat bordered class="card-suave">
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
    </q-table>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { api } from 'src/boot/axios'
import { mensajeError, mensajeOk } from 'src/utils/errores'

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
    const { data } = await api.get('/usuarios/verificaciones')
    filas.value = data.data || []
  } catch (e) {
    mensajeError(e, 'No se pudieron cargar las verificaciones')
  } finally {
    cargando.value = false
  }
}

async function decidir(fila, estado) {
  try {
    await api.put(`/usuarios/verificaciones/${fila._id}/${estado === 'Aprobada' ? 'aprobar' : 'rechazar'}`)
    mensajeOk(`Verificación ${estado}`)
    await cargar()
  } catch (e) {
    mensajeError(e, 'No se pudo procesar la verificación')
  }
}

onMounted(cargar)
</script>
