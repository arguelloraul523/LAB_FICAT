<script setup>
/**
 * COMPONENTE REUTILIZABLE — /components/Tables/TablaDatos.vue
 *
 * Envoltorio sobre <q-table> con las decisiones ya tomadas: buscador, paginado,
 * estado "cargando" y mensaje cuando no hay datos. Todas las pantallas de
 * listado usan este mismo componente con columnas distintas.
 *
 * No sabe QUÉ está pintando: recibe filas y columnas por props y delega las
 * celdas especiales en slots (se reenvían a q-table tal cual).
 */
import { computed, ref, useSlots } from 'vue'

defineProps({
  /** Array de objetos a mostrar (las filas). */
  filas: { type: Array, required: true },
  /** Definición de columnas de Quasar: { name, label, field, align, sortable }. */
  columnas: { type: Array, required: true },
  /** Muestra la barra de progreso mientras llegan los datos del backend. */
  cargando: { type: Boolean, default: false },
  /** Campo único de cada fila. En Mongo siempre es "_id". */
  filaClave: { type: String, default: '_id' },
  /** Texto cuando la consulta no devolvió nada. */
  mensajeVacio: { type: String, default: 'No hay registros para mostrar' },
})

// Estado propio del componente: el texto del buscador. Es LOCAL, no va al store.
const busqueda = ref('')

// Slots que este componente ya resuelve por su cuenta; el resto se reenvía.
const slotsPropios = ['default', 'top', 'no-data', 'acciones-tabla']
const slots = useSlots()
const slotsReenviados = computed(() =>
  Object.keys(slots).filter((nombre) => !slotsPropios.includes(nombre))
)
</script>

<template>
  <q-table
    :rows="filas"
    :columns="columnas"
    :row-key="filaClave"
    :loading="cargando"
    :filter="busqueda"
    :rows-per-page-options="[10, 25, 50, 0]"
    :no-data-label="mensajeVacio"
    no-results-label="Ningún registro coincide con la búsqueda"
    loading-label="Consultando al servidor..."
    rows-per-page-label="Registros por página"
    flat
    bordered
    card-class="card-suave"
    class="tabla-datos"
  >
    <!-- Barra superior: buscador + acciones extra de quien la use -->
    <template #top>
      <div class="row full-width items-center q-col-gutter-sm">
        <div class="col-12 col-sm-5">
          <q-input v-model="busqueda" dense outlined clearable debounce="300" placeholder="Buscar...">
            <template #prepend>
              <q-icon name="search" />
            </template>
          </q-input>
        </div>

        <q-space class="gt-xs" />

        <div class="col-12 col-sm-auto">
          <slot name="acciones-tabla" />
        </div>
      </div>
    </template>

    <!-- Reenvío de slots: desde la vista se escribe <template #body-cell-x> -->
    <template v-for="nombre in slotsReenviados" :key="nombre" #[nombre]="datosDelSlot">
      <slot :name="nombre" v-bind="datosDelSlot || {}" />
    </template>

    <!-- Estado vacío -->
    <template #no-data>
      <div class="full-width column flex-center q-py-xl">
        <q-icon name="inbox" size="64px" color="grey-4" class="q-mb-sm" />
        <span class="text-grey-6">{{ mensajeVacio }}</span>
      </div>
    </template>
  </q-table>
</template>

<style scoped>
.tabla-datos {
  border-radius: 12px;
}
</style>
