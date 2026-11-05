<template>
  <div>
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h6 text-weight-bold">Muestras (gestión)</div>
      <q-btn flat color="primary" icon="refresh" label="Actualizar" no-caps @click="cargar" />
    </div>

    <q-table :rows="filas" :columns="columnas" row-key="_id" :loading="cargando" flat bordered class="card-suave">
      <template #body-cell-prioridad="props">
        <q-td :props="props"><span :class="props.value === 'A1' ? 'prioridad-a1' : 'prioridad-a2'">{{ props.value }}</span></q-td>
      </template>
      <template #body-cell-etapaActual="props">
        <q-td :props="props"><q-badge color="secondary" text-color="white">{{ props.value }}</q-badge></q-td>
      </template>
      <template #body-cell-acciones="props">
        <q-td :props="props">
          <q-btn flat dense color="primary" icon="update" label="Etapa" no-caps @click="abrirEtapa(props.row)" />
          <q-btn flat dense color="negative" icon="send" label="Enviar observaciones" no-caps @click="abrirObservaciones(props.row)" />
          <q-btn v-if="props.row.estado !== 'Rechazada'" flat dense color="warning" icon="block" label="Rechazar" no-caps @click="abrirRechazo(props.row)" />
        </q-td>
      </template>
    </q-table>

    <!-- Diálogo: cambiar etapa -->
    <q-dialog v-model="dialogoEtapa">
      <q-card style="width: 100%; max-width: 480px">
        <q-card-section>
          <div class="text-h6 text-weight-bold">Cambiar etapa</div>
          <div class="text-caption text-grey-7">Muestra {{ muestraSel?.codigoMuestra }}</div>
        </q-card-section>
        <q-card-section>
          <q-form @submit="guardarEtapa" class="q-gutter-md">
            <q-select v-model="formEtapa.etapaActual" label="Nueva etapa" outlined dense :options="etapas" lazy-rules :rules="[v => !!v || 'Obligatorio']" />
            <q-input v-model="formEtapa.justificacion" label="Justificación (obligatoria para Re-ensayo)" outlined dense type="textarea" />
            <div class="row justify-end q-gutter-sm">
              <q-btn flat label="Cancelar" color="grey-7" v-close-popup no-caps />
              <q-btn type="submit" color="primary" label="Guardar" :loading="guardando" no-caps />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Diálogo: enviar observaciones al cliente -->
    <q-dialog v-model="dialogoObs">
      <q-card style="width: 100%; max-width: 480px">
        <q-card-section>
          <div class="text-h6 text-weight-bold">Enviar observaciones al cliente</div>
          <div class="text-caption text-grey-7">Muestra {{ muestraSel?.codigoMuestra }}</div>
        </q-card-section>
        <q-card-section>
          <q-form @submit="enviarObservaciones" class="q-gutter-md">
            <q-input v-model="formObs.asunto" label="Asunto" outlined dense lazy-rules :rules="[v => !!v || 'Obligatorio']" />
            <q-input v-model="formObs.contenido" label="Observaciones" outlined dense type="textarea" autogrow lazy-rules :rules="[v => !!v || 'Obligatorio']" />
            <div class="row justify-end q-gutter-sm">
              <q-btn flat label="Cancelar" color="grey-7" v-close-popup no-caps />
              <q-btn type="submit" color="negative" label="Enviar" :loading="guardando" no-caps />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
    <!-- Diálogo: rechazar muestra -->
    <q-dialog v-model="dialogoRechazo">
      <q-card style="width: 100%; max-width: 480px">
        <q-card-section>
          <div class="text-h6 text-weight-bold">Rechazar muestra</div>
          <div class="text-caption text-grey-7">Muestra {{ muestraSel?.codigoMuestra }}</div>
        </q-card-section>
        <q-card-section>
          <q-form @submit="rechazar" class="q-gutter-md">
            <q-select
              v-model="formRechazo.motivo"
              label="Motivo de rechazo"
              outlined
              dense
              :options="motivos"
              option-label="nombre"
              option-value="_id"
              emit-value
              map-options
              lazy-rules
              :rules="[v => !!v || 'Obligatorio']"
            />
            <q-input v-model="formRechazo.observaciones" label="Observaciones" outlined dense type="textarea" autogrow />
            <div class="row justify-end q-gutter-sm">
              <q-btn flat label="Cancelar" color="grey-7" v-close-popup no-caps />
              <q-btn type="submit" color="warning" label="Rechazar muestra" :loading="guardando" no-caps />
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
import { mensajeError, mensajeOk } from 'src/utils/errores'

const filas = ref([])
const cargando = ref(false)
const guardando = ref(false)
const dialogoEtapa = ref(false)
const dialogoObs = ref(false)
const dialogoRechazo = ref(false)
const muestraSel = ref(null)
const motivos = ref([])

// 'Cancelada' la escribe solo el servidor al rechazar (no se selecciona).
const etapas = ['Recepción', 'Análisis', 'Observaciones', 'Resultados', 'Validación', 'Re-ensayo', 'Finalizada']

const columnas = [
  { name: 'codigoMuestra', label: 'Código', field: 'codigoMuestra', align: 'left' },
  { name: 'prioridad', label: 'Prioridad', field: 'prioridad', align: 'left' },
  { name: 'numeroTurno', label: 'Turno', field: 'numeroTurno', align: 'left' },
  { name: 'etapaActual', label: 'Etapa', field: 'etapaActual', align: 'left' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'left' },
  { name: 'acciones', label: 'Acciones', field: '', align: 'left' },
]

const formEtapa = reactive({ etapaActual: '', justificacion: '' })
const formObs = reactive({ asunto: '', contenido: '' })
const formRechazo = reactive({ motivo: null, observaciones: '' })

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

function abrirEtapa(fila) {
  muestraSel.value = fila
  Object.assign(formEtapa, { etapaActual: fila.etapaActual, justificacion: '' })
  dialogoEtapa.value = true
}

async function guardarEtapa() {
  guardando.value = true
  try {
    await api.put(`/muestras/${muestraSel.value._id}/cambiar-etapa`, formEtapa)
    mensajeOk('Etapa actualizada')
    dialogoEtapa.value = false
    await cargar()
  } catch (e) {
    mensajeError(e, 'No se pudo cambiar la etapa')
  } finally {
    guardando.value = false
  }
}

function abrirObservaciones(fila) {
  muestraSel.value = fila
  Object.assign(formObs, {
    asunto: `Observaciones de tu muestra ${fila.codigoMuestra || ''}`.trim(),
    contenido: '',
  })
  dialogoObs.value = true
}

async function enviarObservaciones() {
  const clienteId = muestraSel.value?.solicitud?.usuario
  if (!clienteId) {
    mensajeError({ response: { data: { mensaje: 'No se encontró el cliente de esta muestra' } } })
    return
  }
  guardando.value = true
  try {
    await api.post('/notificaciones/enviar-correo', {
      usuario: clienteId,
      asunto: formObs.asunto,
      contenido: formObs.contenido,
    })
    mensajeOk('Observaciones enviadas al cliente')
    dialogoObs.value = false
  } catch (e) {
    mensajeError(e, 'No se pudieron enviar las observaciones')
  } finally {
    guardando.value = false
  }
}

async function abrirRechazo(fila) {
  muestraSel.value = fila
  Object.assign(formRechazo, { motivo: null, observaciones: '' })
  if (!motivos.value.length) {
    try {
      const { data } = await api.get('/rechazos/motivos')
      motivos.value = data.data || []
    } catch (e) {
      mensajeError(e, 'No se pudieron cargar los motivos de rechazo')
    }
  }
  dialogoRechazo.value = true
}

async function rechazar() {
  guardando.value = true
  try {
    await api.post('/rechazos', {
      muestra: muestraSel.value._id,
      motivo: formRechazo.motivo,
      observaciones: formRechazo.observaciones,
    })
    mensajeOk('Muestra rechazada; se notificó al cliente (App + correo)')
    dialogoRechazo.value = false
    await cargar()
  } catch (e) {
    mensajeError(e, 'No se pudo rechazar la muestra')
  } finally {
    guardando.value = false
  }
}

onMounted(cargar)
</script>
