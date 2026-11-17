<script setup>
/**
 * COMPONENTE — /components/Perfil/CampoPerfil.vue
 * Bloque de dato del perfil: etiqueta, valor, icono, nota opcional y sello de
 * verificación. No conoce el backend: recibe todo por props.
 */
defineProps({
  etiqueta: { type: String, required: true },
  valor: { type: String, default: '—' },
  icono: { type: String, default: 'info' },
  nota: { type: String, default: '' },
  verificado: { type: Boolean, default: false },
  ancho: { type: Boolean, default: false },
})
</script>

<template>
  <div class="campo" :class="{ 'campo--ancho': ancho }">
    <div class="campo__head">
      <span class="campo__etiqueta">{{ etiqueta }}</span>
      <q-icon :name="icono" size="18px" class="campo__icono" />
    </div>

    <div class="campo__valor">{{ valor }}</div>

    <div v-if="verificado || nota" class="campo__pie">
      <span v-if="verificado" class="campo__sello">
        <q-icon name="verified" size="12px" /> Verificado
      </span>
      <span v-if="nota" class="campo__nota">{{ nota }}</span>
    </div>
  </div>
</template>

<style scoped>
.campo {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(226, 232, 240, 0.6);
  box-shadow: 0 1px 2px rgba(11, 34, 56, 0.04);
  transition: border-color 0.18s ease;
}
.campo:hover {
  border-color: rgba(57, 169, 0, 0.4);
}
.campo--ancho {
  grid-column: 1 / -1;
}

.campo__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.campo__etiqueta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: #94a3b8;
}

.campo__icono {
  color: #94a3b8;
}

.campo__valor {
  font-size: 14px;
  font-weight: 700;
  color: #0b2238;
  overflow-wrap: anywhere;
}

.campo__pie {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.campo__sello {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border-radius: 999px;
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
}

.campo__nota {
  font-size: 11px;
  color: #64748b;
}
</style>
