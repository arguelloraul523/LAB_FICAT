<template>
  <span ref="host" class="chatbot-mascot-host" />
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  crearAvatarEstatico,
  crearMascota,
  desregistrarMascota,
  setAnimacion,
} from './mascot'

const props = defineProps({
  animacion: { type: String, default: 'reposo' },
  size: { type: Number, default: 64 },
  estatico: { type: Boolean, default: false },
  // Sin default: `undefined` deja que mascot.js decida por tamaño.
  seguirCursor: { type: Boolean, default: undefined },
  // Cambiar este número repite la animación aunque `animacion` no cambie.
  pulso: { type: Number, default: 0 },
})

const host = ref(null)
let nodo = null

onMounted(() => {
  if (!host.value) return
  const opciones = props.seguirCursor === undefined ? {} : { seguirCursor: props.seguirCursor }
  nodo = props.estatico
    ? crearAvatarEstatico(props.animacion, props.size)
    : crearMascota(props.animacion, props.size, opciones)
  host.value.appendChild(nodo)
})

watch(
  () => props.animacion,
  (valor) => {
    if (nodo && !props.estatico) setAnimacion(nodo, valor, { repetir: true })
  }
)

// Un pulso nuevo = repetir la animación actual aunque sea el mismo estado
// (p. ej. ráfagas de clics sobre "enojado").
watch(
  () => props.pulso,
  () => {
    if (nodo && !props.estatico) setAnimacion(nodo, props.animacion, { repetir: true })
  }
)

onBeforeUnmount(() => {
  if (nodo && !props.estatico) desregistrarMascota(nodo)
  nodo = null
})
</script>

<style scoped>
.chatbot-mascot-host {
  display: inline-flex;
  line-height: 0;
}
</style>
