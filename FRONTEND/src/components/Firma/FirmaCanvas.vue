<template>
  <div>
    <canvas
      ref="canvas"
      class="firma-canvas"
      :width="width"
      :height="height"
      @mousedown="empezar"
      @mousemove="dibujar"
      @mouseup="terminar"
      @mouseleave="terminar"
      @touchstart="empezar"
      @touchmove="dibujar"
      @touchend="terminar"
    ></canvas>
    <div class="row justify-between q-mt-sm">
      <q-btn flat dense color="grey-7" icon="delete" label="Limpiar" no-caps @click="limpiar" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  width: { type: Number, default: 500 },
  height: { type: Number, default: 200 },
})
const emit = defineEmits(['update:modelValue'])

const canvas = ref(null)
let dibujando = false

function ctx() {
  return canvas.value?.getContext('2d')
}

function coordenadas(e) {
  const rect = canvas.value.getBoundingClientRect()
  const t = e.touches ? e.touches[0] : e
  return { x: t.clientX - rect.left, y: t.clientY - rect.top }
}

function empezar(e) {
  dibujando = true
  const c = ctx()
  const { x, y } = coordenadas(e)
  c.beginPath()
  c.moveTo(x, y)
  e.preventDefault()
}

function dibujar(e) {
  if (!dibujando) return
  const c = ctx()
  const { x, y } = coordenadas(e)
  c.lineTo(x, y)
  c.lineWidth = 2.5
  c.lineCap = 'round'
  c.strokeStyle = '#1f2937'
  c.stroke()
  emit('update:modelValue', canvas.value.toDataURL('image/png'))
  e.preventDefault()
}

function terminar() {
  dibujando = false
}

function limpiar() {
  const c = ctx()
  c.clearRect(0, 0, props.width, props.height)
  emit('update:modelValue', '')
}

onMounted(() => {
  const c = ctx()
  c.fillStyle = '#ffffff'
  c.fillRect(0, 0, props.width, props.height)
  c.lineWidth = 2.5
})
</script>

<style scoped>
.firma-canvas {
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  width: 100%;
  height: auto;
  touch-action: none;
}
</style>
