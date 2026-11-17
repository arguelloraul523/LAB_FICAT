<script setup>
/**
 * COMPONENTE — /components/Perfil/TarjetaMetrica.vue
 * Tarjeta de indicador del perfil (glass). Recibe todo por props; si el rol
 * no puede consultar la métrica, la vista simplemente no la renderiza.
 */
defineProps({
  titulo: { type: String, required: true },
  valor: { type: [String, Number], default: '—' },
  icono: { type: String, default: 'insights' },
  color: { type: String, default: 'primary' },
  nota: { type: String, default: '' },
  mensaje: { type: String, default: '' },
  progreso: { type: Number, default: null },
})
</script>

<template>
  <div class="metrica glass-card">
    <div class="metrica__head">
      <span class="metrica__titulo">{{ titulo }}</span>
      <span class="metrica__icono" :class="`metrica__icono--${color}`">
        <q-icon :name="icono" size="20px" />
      </span>
    </div>

    <div class="metrica__valor">{{ valor }}</div>

    <div v-if="progreso !== null" class="metrica__progreso">
      <div class="barra">
        <div class="barra__relleno" :style="{ width: `${Math.min(100, Math.max(0, progreso))}%` }" />
      </div>
      <span v-if="nota" class="metrica__nota">{{ nota }}</span>
    </div>

    <div v-else-if="nota || mensaje" class="metrica__pie">
      <span v-if="mensaje" class="metrica__mensaje">
        <q-icon name="check_circle" size="15px" /> {{ mensaje }}
      </span>
      <span v-if="nota" class="metrica__nota">{{ nota }}</span>
    </div>
  </div>
</template>

<style scoped>
.metrica {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  padding: 20px;
  border-radius: 16px;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  height: 100%;
}
.metrica:hover {
  box-shadow: var(--shadow-floating-hover);
  transform: translateY(-1px);
}

.metrica__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
}

.metrica__titulo {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: #64748b;
}

.metrica__icono {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.metrica__icono--primary {
  background: #eef9e8;
  color: #39a900;
  border: 1px solid rgba(57, 169, 0, 0.2);
}
.metrica__icono--azul {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #dbeafe;
}
.metrica__icono--ambar {
  background: #fffbeb;
  color: #d97706;
  border: 1px solid #fef3c7;
}
.metrica__icono--indigo {
  background: #eef2ff;
  color: #4f46e5;
  border: 1px solid #e0e7ff;
}

.metrica__valor {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.6px;
  color: #0b2238;
  line-height: 1.1;
}

.metrica__progreso {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.barra {
  height: 6px;
  border-radius: 999px;
  background: #f1f5f9;
  overflow: hidden;
}
.barra__relleno {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #39a900, #46c503);
}

.metrica__pie {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.metrica__mensaje {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #15803d;
}
.metrica__nota {
  font-size: 11px;
  color: #64748b;
}
</style>
