<template>
  <!-- Campo de fecha y hora SIN <input type="datetime-local">: texto con máscara
       + calendario y reloj de Quasar (el navegador/Windows no aporta nada). -->
  <q-input
    :model-value="modelValue"
    :label="label"
    outlined
    dense
    mask="####-##-## ##:##"
    placeholder="AAAA-MM-DD HH:MM"
    inputmode="numeric"
    lazy-rules
    :rules="[reglaFechaHora]"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <template #append>
      <q-icon name="event" class="cursor-pointer" aria-label="Abrir calendario y reloj">
        <q-popup-proxy cover transition-show="scale" transition-hide="scale">
          <div class="fecha-hora-popup">
            <q-date
              :model-value="fecha || null"
              mask="YYYY-MM-DD"
              minimal
              @update:model-value="alElegirFecha"
            />
            <q-separator />
            <q-time
              :model-value="hora || '00:00'"
              mask="HH:mm"
              format24h
              now-btn
              @update:model-value="alElegirHora"
            />
          </div>
        </q-popup-proxy>
      </q-icon>
    </template>
  </q-input>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'Fecha y hora' },
})
const emit = defineEmits(['update:modelValue'])

// modelValue tiene el formato "AAAA-MM-DD HH:MM".
const fecha = computed(() => String(props.modelValue || '').slice(0, 10))
const hora = computed(() => String(props.modelValue || '').slice(11, 16))

const reglaFechaHora = (v) =>
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(String(v || '').trim()) ||
  'Elige la fecha y la hora'

function alElegirFecha(nuevaFecha) {
  emit('update:modelValue', `${nuevaFecha} ${hora.value || '00:00'}`)
}

function alElegirHora(nuevaHora) {
  emit('update:modelValue', `${fecha.value || '1970-01-01'} ${nuevaHora}`)
}
</script>

<style scoped>
.fecha-hora-popup {
  width: 296px;
}
</style>
