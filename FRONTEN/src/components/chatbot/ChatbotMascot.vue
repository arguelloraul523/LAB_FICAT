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
