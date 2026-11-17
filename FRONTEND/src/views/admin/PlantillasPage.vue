<template>
  <div>
    <EncabezadoPagina
      titulo="Plantillas de correo"
      subtitulo="Mensajes que envía el sistema (RF-14): el cambio se aplica en el siguiente envío"
      icono="mail"
    />

    <TablaDatos
      :filas="filas"
      :columnas="columnas"
      :cargando="cargando"
      mensaje-vacio="No hay plantillas de mensaje"
    >
      <template #body-cell-canal="props">
        <q-td :props="props">
          <q-badge :color="props.value === 'Correo' ? 'primary' : props.value === 'App' ? 'info' : 'positive'" text-color="white">
            {{ props.value }}
          </q-badge>
        </q-td>
      </template>
      <template #body-cell-fechaModificacion="props">
        <q-td :props="props">{{ formatoFecha(props.value) }}</q-td>
      </template>
      <template #body-cell-acciones="props">
        <q-td :props="props">
          <q-btn flat dense color="primary" icon="edit" @click="abrir(props.row)">
            <q-tooltip>Editar asunto y cuerpo</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </TablaDatos>

    <q-dialog v-model="dialogo" persistent>
      <q-card style="width: 100%; max-width: 760px">
        <q-card-section class="row items-center justify-between">
          <div>
            <div class="text-h6 text-weight-bold">Editar plantilla</div>
            <div class="text-caption text-grey-7">{{ form.nombre }} · <code>{{ form.codigo }}</code></div>
          </div>
          <q-badge :color="form.canal === 'Correo' ? 'primary' : 'info'" text-color="white">{{ form.canal }}</q-badge>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-form novalidate @submit="guardar" class="q-gutter-md">
            <q-input
              v-model="form.asunto"
              label="Asunto del correo"
              outlined
              dense
              lazy-rules
              :rules="[(val) => !!val || 'El asunto es obligatorio']"
            />

            <div class="cuerpo-editor">
              <div class="text-caption text-grey-8 q-mb-xs">
                Cuerpo del mensaje. Puede llevar texto simple o HTML (con colores y diseño).
              </div>
              <q-input
                ref="inputCuerpo"
                v-model="form.cuerpo"
                type="textarea"
                outlined
                autogrow
                :rules="[(val) => !!val || 'El cuerpo es obligatorio']"
              />
            </div>

            <div>
              <div class="text-caption text-grey-8 q-mb-xs">Variables disponibles (clic para insertar donde está el cursor):</div>
              <div class="q-gutter-xs">
                <q-badge
                  v-for="v in variables"
                  :key="v.clave"
                  outline
                  color="primary"
                  class="cursor-pointer"
                  @click="insertarVariable(v.clave)"
                >
                  {{ v.clave }}
                  <q-tooltip>{{ v.descripcion }}</q-tooltip>
                </q-badge>
              </div>
            </div>

            <div>
              <q-toggle v-model="mostrarPrevia" label="Ver vista previa con datos de ejemplo" />
              <div v-if="mostrarPrevia" class="previa q-pa-sm q-mt-xs">
                <div class="text-subtitle2 text-grey-8 q-mb-xs">Asunto: {{ render(form.asunto) }}</div>
                <!-- eslint-disable-next-line vue/no-v-html — el admin previsualiza su propio HTML -->
                <div class="previa-cuerpo" v-html="render(form.cuerpo)"></div>
              </div>
            </div>

            <div class="text-caption text-grey-7">
              No reinicies el servidor: la plantilla se lee en cada envío, así que el próximo correo ya sale con estos cambios.
            </div>

            <div class="row justify-end q-gutter-sm">
              <q-btn flat label="Cancelar" color="grey-7" v-close-popup no-caps />
              <q-btn type="submit" color="primary" label="Guardar" :loading="guardando" no-caps />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, computed, nextTick } from 'vue'
import EncabezadoPagina from '@/components/Encabezados/EncabezadoPagina.vue'
import TablaDatos from '@/components/Tables/TablaDatos.vue'
import { get, put } from '@/services/api.service'
import { useNotificar } from '@/composables/useNotificar'

const { notificarOk, notificarError } = useNotificar()

const filas = ref([])
const cargando = ref(false)
const guardando = ref(false)
const dialogo = ref(false)
const inputCuerpo = ref(null)
const mostrarPrevia = ref(false)
const editando = ref(null)

const form = reactive({ nombre: '', codigo: '', canal: 'Correo', asunto: '', cuerpo: '' })

const columnas = [
  { name: 'nombre', label: 'Nombre', field: 'nombre', align: 'left' },
  { name: 'codigo', label: 'Código', field: 'codigo', align: 'left' },
  { name: 'tipo', label: 'Tipo', field: 'tipo', align: 'left' },
  { name: 'canal', label: 'Canal', field: 'canal', align: 'left' },
  { name: 'asunto', label: 'Asunto', field: 'asunto', align: 'left' },
  { name: 'fechaModificacion', label: 'Última edición', field: 'fechaModificacion', align: 'left' },
  { name: 'acciones', label: 'Acciones', field: '', align: 'left' },
]

// Variables que el motor de notificación reemplaza ({{clave}}).
const variables = [
  { clave: '{{nombre}}', descripcion: 'Nombre del usuario destinatario' },
  { clave: '{{fecha}}', descripcion: 'Fecha y hora actuales' },
  { clave: '{{orden}}', descripcion: 'Código de la solicitud / cotización' },
  { clave: '{{estado}}', descripcion: 'Estado actual del registro' },
  { clave: '{{motivo}}', descripcion: 'Motivo de rechazo o incidencia' },
  { clave: '{{observaciones}}', descripcion: 'Observaciones del personal' },
  { clave: '{{instrucciones}}', descripcion: 'Instrucciones de muestra (RF-12)' },
  { clave: '{{codigo}}', descripcion: 'Código de 6 dígitos de recuperación' },
  { clave: '{{minutos}}', descripcion: 'Validez del código en minutos' },
  { clave: '{{codigoMuestra}}', descripcion: 'Código de la muestra (A1/A2-AAAA-NNNN)' },
  { clave: '{{prioridad}}', descripcion: 'Prioridad A1 / A2' },
  { clave: '{{turno}}', descripcion: 'Número de turno del día' },
  { clave: '{{porcentajeAvance}}', descripcion: 'Avance de la muestra (%)' },
  { clave: '{{dias}}', descripcion: 'Días de retraso' },
  { clave: '{{respuesta}}', descripcion: 'Respuesta a la PQR' },
  { clave: '{{actaPdf}}', descripcion: 'Enlace al acta PDF' },
]

// Datos ficticios solo para la vista previa.
const EJEMPLOS = {
  nombre: 'María Pérez',
  fecha: '17/11/2026, 10:45 a. m.',
  orden: 'PRE-2026-0042',
  estado: 'En proceso',
  motivo: 'Temperatura fuera de rango',
  observaciones: 'Muestra recibida sin indicios de deterioro',
  instrucciones: '10 g en frasco estéril · 2 a 8 °C · máximo 24 h de traslado',
  codigo: '482913',
  minutos: 10,
  codigoMuestra: 'A1-2026-0017',
  prioridad: 'A1',
  turno: 12,
  porcentajeAvance: 75,
  dias: 3,
  respuesta: 'Hemos revisado tu caso y aplicamos el ajuste solicitado.',
  actaPdf: '(enlace al acta)',
}

const render = (texto) =>
  String(texto ?? '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, clave) =>
    EJEMPLOS[clave] === undefined ? '' : String(EJEMPLOS[clave])
  )

function formatoFecha(valor) {
  if (!valor) return '—'
  return new Date(valor).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

async function cargar() {
  cargando.value = true
  try {
    const data = await get('/configuracion/plantillas')
    filas.value = data.data || []
  } catch (e) {
    notificarError(e, 'No se pudieron cargar las plantillas')
  } finally {
    cargando.value = false
  }
}

function abrir(fila) {
  editando.value = fila
  Object.assign(form, {
    nombre: fila.nombre || '',
    codigo: fila.codigo || '',
    canal: fila.canal || 'Correo',
    asunto: fila.asunto || '',
    cuerpo: fila.cuerpo || '',
  })
  mostrarPrevia.value = false
  dialogo.value = true
}

function insertarVariable(clave) {
  const el = inputCuerpo.value?.$el?.querySelector?.('textarea')
  const texto = form.cuerpo || ''
  if (!el) {
    form.cuerpo = texto + clave
    return
  }
  const ini = el.selectionStart ?? texto.length
  const fin = el.selectionEnd ?? ini
  form.cuerpo = texto.slice(0, ini) + clave + texto.slice(fin)
  nextTick(() => {
    el.focus()
    el.selectionStart = el.selectionEnd = ini + clave.length
  })
}

async function guardar() {
  guardando.value = true
  try {
    // Solo asunto y cuerpo: el código/nombre/tipo/canal no se tocan desde aquí.
    await put(`/configuracion/plantillas/${editando.value._id}`, {
      asunto: form.asunto,
      cuerpo: form.cuerpo,
    })
    notificarOk('Plantilla actualizada: el próximo correo saldrá con estos cambios')
    dialogo.value = false
    await cargar()
  } catch (e) {
    notificarError(e, 'No se pudo guardar la plantilla')
  } finally {
    guardando.value = false
  }
}

onMounted(cargar)
</script>

<style scoped>
/* El textarea lo renderiza q-input (hijo), por eso :deep(). */
.cuerpo-editor :deep(textarea) {
  font-family: Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.45;
}
.previa {
  border: 1px solid #e0e6ee;
  border-radius: 8px;
  background: #f8fafc;
}
.previa-cuerpo {
  background: #ffffff;
  border: 1px dashed #cfd8e3;
  border-radius: 6px;
  padding: 8px;
  overflow-x: auto;
  font-size: 14px;
}
</style>
