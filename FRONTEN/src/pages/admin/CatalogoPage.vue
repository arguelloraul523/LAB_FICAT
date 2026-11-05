<template>
  <div>
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h6 text-weight-bold">Catálogo de exámenes</div>
      <q-btn color="primary" icon="add" label="Nuevo examen" no-caps @click="abrir()" />
    </div>

    <q-table :rows="filas" :columns="columnas" row-key="_id" :loading="cargando" flat bordered class="card-suave">
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
    </q-table>

    <q-dialog v-model="dialogo">
      <q-card style="width: 100%; max-width: 560px">
        <q-card-section><div class="text-h6 text-weight-bold">{{ editando ? 'Editar examen' : 'Nuevo examen' }}</div></q-card-section>
        <q-card-section>
          <q-form @submit="guardar" class="q-gutter-md">
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
              <q-input v-model="form.precio" type="number" label="Precio" outlined dense class="col-6" lazy-rules :rules="[val => val != null || 'Obligatorio']" />
              <q-input v-model="form.tiempoRespuestaDias" type="number" label="Días de respuesta" outlined dense class="col-6" />
            </div>
            <div class="row q-col-gutter-md">
              <q-input v-model="form.cantidadRequerida" type="number" label="Cantidad requerida" outlined dense class="col-4" />
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
import { api } from 'src/boot/axios'
import { useCatalogoStore } from 'src/stores/catalogo'
import { mensajeError, mensajeOk } from 'src/utils/errores'
import { useQuasar } from 'quasar'

const $q = useQuasar()
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
    const [{ data: e }, { data: c }, { data: t }] = await Promise.all([
      api.get('/catalogo/examenes', { params: { limite: 100 } }),
      api.get('/catalogo/categorias', { params: { limite: 100 } }),
      api.get('/catalogo/tipos-muestra', { params: { limite: 100 } }),
    ])
    filas.value = e.data || []
    categorias.value = c.data || []
    tipos.value = t.data || []
  } catch (err) {
    mensajeError(err, 'No se pudo cargar el catálogo')
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
    if (editando.value) await api.put(`/catalogo/examenes/${editando.value._id}`, form)
    else await api.post('/catalogo/examenes', form)
    mensajeOk(editando.value ? 'Examen actualizado' : 'Examen creado')
    dialogo.value = false
    await cargar()
  } catch (e) {
    mensajeError(e, 'No se pudo guardar el examen')
  } finally {
    guardando.value = false
  }
}

function eliminar(fila) {
  $q.dialog({
    title: 'Eliminar examen',
    message: `¿Eliminar "${fila.nombre}"?`,
    cancel: true,
    ok: { label: 'Eliminar', color: 'negative' },
  }).onOk(async () => {
    try {
      await api.delete(`/catalogo/examenes/${fila._id}`)
      mensajeOk('Examen eliminado')
      await cargar()
    } catch (e) {
      mensajeError(e, 'No se pudo eliminar')
    }
  })
}

onMounted(cargar)
</script>
