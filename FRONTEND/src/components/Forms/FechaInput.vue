<template>
  <!-- Campo de fecha SIN <input type="date">: texto con máscara + calendario de Quasar. -->
  <q-input
    :model-value="modelValue"
    :label="label"
    outlined
    dense
    mask="####-##-##"
    placeholder="AAAA-MM-DD"
    inputmode="numeric"
    lazy-rules
    :rules="rules"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <template #append>
      <q-icon name="event" class="cursor-pointer" aria-label="Abrir calendario">
        <q-popup-proxy cover transition-show="scale" transition-hide="scale">
          <q-date :model-value="modelValue" mask="YYYY-MM-DD" minimal @update:model-value="(v) => emit('update:modelValue', v)">
            <div class="row items-center justify-end">
              <q-btn v-close-popup label="Cerrar" color="primary" flat no-caps />
            </div>
          </q-date>
        </q-popup-proxy>
      </q-icon>
    </template>
  </q-input>
</template>

<script setup>
import { fechaISO } from '@/utils/reglas'

defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'Fecha' },
  rules: { type: Array, default: () => [fechaISO] },
})
const emit = defineEmits(['update:modelValue'])
</script>
