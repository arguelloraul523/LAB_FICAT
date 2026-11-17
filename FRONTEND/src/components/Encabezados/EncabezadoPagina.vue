<script setup>
/**
 * COMPONENTE REUTILIZABLE — /components/Encabezados/EncabezadoPagina.vue
 *
 * Encabezado estándar de cualquier pantalla: icono + título + subtítulo y un
 * espacio libre a la derecha para los botones de acción.
 *
 * ¿Por qué vive en /components y no en /views?
 * Porque NO conoce ninguna ruta ni ningún dato del backend. Recibe todo por
 * props y no decide nada: eso lo hace reutilizable.
 *
 * Uso:
 *   <EncabezadoPagina titulo="Catálogo" subtitulo="Gestión de exámenes" icono="science">
 *     <template #acciones>
 *       <q-btn label="Nuevo" @click="abrir" />
 *     </template>
 *   </EncabezadoPagina>
 */
defineProps({
  titulo: { type: String, required: true },
  subtitulo: { type: String, default: '' },
  icono: { type: String, default: '' },
})
</script>

<template>
  <div class="row items-center justify-between q-col-gutter-md q-mb-md">
    <!-- Bloque izquierdo: identidad de la pantalla -->
    <div class="col-12 col-sm-auto row items-center no-wrap">
      <q-icon v-if="icono" :name="icono" size="28px" color="primary" class="q-mr-sm" />
      <div>
        <div class="text-h6 text-weight-bold">{{ titulo }}</div>
        <div v-if="subtitulo" class="text-caption text-grey-7">{{ subtitulo }}</div>
      </div>
    </div>

    <!-- Bloque derecho: SLOT. El componente no sabe qué botones van. -->
    <div class="col-12 col-sm-auto row justify-end">
      <slot name="acciones" />
    </div>
  </div>
</template>
