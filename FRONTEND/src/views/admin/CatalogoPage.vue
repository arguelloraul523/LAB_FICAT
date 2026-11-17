<template>
  <div>
    <EncabezadoPagina titulo="Catálogo de exámenes" icono="science">
      <template #acciones>
        <q-btn color="primary" icon="add" label="Nuevo examen" no-caps @click="abrir()" />
      </template>
    </EncabezadoPagina>

    <TablaDatos :filas="filas" :columnas="columnas" :cargando="cargando" mensaje-vacio="No hay exámenes en el catálogo">
      <template #body-cell-precio="props">
        <q-td :props="props">{{ formatoCOP(props.value) }}</q-td>
      </template>
      <template #body-cell-activo="props">
        <q-td :props="props"><q-badge :color="props.value ? 'positive' : 'negative'" text-color="white">{{ props.value ? 'Activo' : 'Inactivo' }}</q-badge></q-td>
      </template>
      <template #body-cell-acciones="props">
        <q-td :props="props">
          <q-btn flat dense color="primary" icon="edit" @click="abrir(props.row)" />
          <q-btn flat dense color="negative" icon="delete" @click="eliminar(props.row)" />
        </q-td>
      </template>
    </TablaDatos>

    <q-dialog v-model="dialogo">
      <q-card style="width: 100%; max-width: 560px">
        <q-card-section><div class="text-h6 text-weight-bold">{{ editando ? 'Editar examen' : 'Nuevo examen' }}</div></q-card-section>
        <q-card-section>
          <q-form novalidate @submit="guardar" class="q-gutter-md">
            <q-select v-model="form.categoria" label="Categoría" outlined dense :options="categorias" option-label="nombre" option-value="_id" emit-value map-options lazy-rules :rules="[val => !!val || 'Obligatorio']" />
            <q-select v-model="form.tipoMuestra" label="Tipo de muestra" outlined dense :options="tipos" option-label="nombre" option-value="_id" emit-value map-options lazy-rules :rules="[val => !!val || 'Obligatorio']" />
            <q-input v-model="form.nombre" label="Nombre" outlined dense lazy-rules :rules="[val => !!val || 'Obligatorio']" />
            <q-input v-model="form.descripcion" label="Descripción" outlined dense type="textarea" />
            <div class="row q-col-gutter-md">
              <q-input v-model="form.metodo" label="Método (ej. AOAC 900.02 C:2023)" outlined dense class="col-6" />
              <q-input v-model="form.tecnica" label="Técnica (ej. Gravimetría)" outlined dense class="col-6" />
            </div>
            <q-toggle v-model="form.tercerizado" label="Tercerizado (laboratorio externo)" />
            <div class="row q-col-gutter-md">
              <q-input v-model="form.precio" type="text" inputmode="decimal" label="Precio" outlined dense class="col-6" lazy-rules :rules="[numeroObligatorio]" />
              <q-input v-model="form.tiempoRespuestaDias" type="text" inputmode="numeric" label="Días de respuesta" outlined dense class="col-6" lazy-rules :rules="[numero]" />
            </div>
            <div class="row q-col-gutter-md">
              <q-input v-model="form.cantidadRequerida" type="text" inputmode="numeric" label="Cantidad requerida" outlined dense class="col-4" lazy-rules :rules="[numero]" />
              <q-input v-model="form.unidadMedida" label="Unidad" outlined dense class="col-4" />
              <q-input v-model="form.tipoEnvase" label="Envase" outlined dense class="col-4" />
            </div>
            <q-toggle v-model="form.requiereTemperatura" label="Requiere temperatura" />
            <div class="row justify-end q-gutter-sm">
              <q-btn flat label="Cancelar" color="grey-7" v-close-popup no-caps />
              <q-btn type="submit" color="primary" :label="editando ? 'Guardar' : 'Crear'" :loading="guardando" no-caps />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import EncabezadoPagina from '@/components/Encabezados/EncabezadoPagina.vue'
import TablaDatos from '@/components/Tables/TablaDatos.vue'
import { get, post, put, del } from '@/services/api.service'
import { useCatalogoStore } from '@/store/catalogo'
import { useNotificar } from '@/composables/useNotificar'
import { useConfirmar } from '@/composables/useConfirmar'
// Reglas de Quasar: el navegador no valida nada (sin type=number/required).
import { numero, numeroObligatorio, aNumero } from '@/utils/reglas'

const { notificarOk, notificarError, notificarInfo, validacionFallida } = useNotificar()
const { confirmar } = useConfirmar()

const catalogo = useCatalogoStore()
const filas = ref([])
const categorias = ref([])
const tipos = ref([])
const cargando = ref(false)
const guardando = ref(false)
const dialogo = ref(false)
const editando = ref(null)

const columnas = [
  { name: 'nombre', label: 'Nombre', field: 'nombre', align: 'left' },
  { name: 'metodo', label: 'Método', field: 'metodo', align: 'left' },
  { name: 'tecnica', label: 'Técnica', field: 'tecnica', align: 'left' },
  { name: 'categoria', label: 'Categoría', field: (r) => r.categoria?.nombre || '—', align: 'left' },
  { name: 'tipoMuestra', label: 'Matriz', field: (r) => r.tipoMuestra?.nombre || '—', align: 'left' },
  { name: 'precio', label: 'Precio', field: 'precio', align: 'left' },
  { name: 'activo', label: 'Estado', field: 'activo', align: 'left' },
  { name: 'acciones', label: 'Acciones', field: '', align: 'left' },
]

const vacio = () => ({
  categoria: null,
  tipoMuestra: null,
  nombre: '',
  descripcion: '',
  metodo: '',
  tecnica: '',
  tercerizado: false,
  precio: null,
  tiempoRespuestaDias: null,
  cantidadRequerida: null,
  unidadMedida: '',
  tipoEnvase: '',
  requiereTemperatura: false,
})
const form = reactive(vacio())

function formatoCOP(v) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0)
}

async function cargar() {
  cargando.value = true
  try {
    const [e, c, t] = await Promise.all([
      get('/catalogo/examenes', { params: { limite: 100 } }),
      get('/catalogo/categorias', { params: { limite: 100 } }),
      get('/catalogo/tipos-muestra', { params: { limite: 100 } }),
    ])
    filas.value = e.data || []
    categorias.value = c.data || []
    tipos.value = t.data || []
  } catch (err) {
    notificarError(err, 'No se pudo cargar el catálogo')
  } finally {
    cargando.value = false
  }
}

function abrir(fila = null) {
  editando.value = fila
  Object.assign(form, vacio(), fila ? {
    categoria: fila.categoria?._id || fila.categoria,
    tipoMuestra: fila.tipoMuestra?._id || fila.tipoMuestra,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    metodo: fila.metodo,
    tecnica: fila.tecnica,
    tercerizado: fila.tercerizado,
    precio: fila.precio,
    tiempoRespuestaDias: fila.tiempoRespuestaDias,
    cantidadRequerida: fila.cantidadRequerida,
    unidadMedida: fila.unidadMedida,
    tipoEnvase: fila.tipoEnvase,
    requiereTemperatura: fila.requiereTemperatura,
  } : {})
  dialogo.value = true
}

async function guardar() {
  guardando.value = true
  try {
    // El input ya no es type=number: normalizamos a número antes de enviar,
    // para que el payload siga recibiendo number (o null si quedó vacío).
    const datos = {
      ...form,
      precio: aNumero(form.precio),
      tiempoRespuestaDias: aNumero(form.tiempoRespuestaDias),
      cantidadRequerida: aNumero(form.cantidadRequerida),
    }
    if (editando.value) await put(`/catalogo/examenes/${editando.value._id}`, datos)
    else await post('/catalogo/examenes', datos)
    notificarOk(editando.value ? 'Examen actualizado' : 'Examen creado')
    dialogo.value = false
    await cargar()
  } catch (e) {
    notificarError(e, 'No se pudo guardar el examen')
  } finally {
    guardando.value = false
  }
}

async function eliminar(fila) {
  const ok = await confirmar({
    titulo: 'Eliminar examen',
    mensaje: `¿Eliminar "${fila.nombre}"?`,
    textoOk: 'Eliminar',
    color: 'negative',
  })
  if (!ok) return
  try {
    await del(`/catalogo/examenes/${fila._id}`)
    notificarOk('Examen eliminado')
    await cargar()
  } catch (e) {
    notificarError(e, 'No se pudo eliminar')
  }
}

onMounted(cargar)
</script>