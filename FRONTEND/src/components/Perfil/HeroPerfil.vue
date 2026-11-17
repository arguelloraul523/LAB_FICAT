<script setup>
/**
 * COMPONENTE — /components/Perfil/HeroPerfil.vue
 * Tarjeta principal de "Mi cuenta": avatar con iniciales, nombre, rol,
 * badges de estado y botones de acción (mockup glass minimal).
 * No conoce rutas ni API: todo entra por props y las acciones se emiten.
 */
defineProps({
  iniciales: { type: String, default: 'U' },
  nombre: { type: String, required: true },
  rol: { type: String, default: '' },
  tipoUsuario: { type: String, default: '' },
  esSena: { type: Boolean, default: false },
  activo: { type: Boolean, default: true },
  institucion: { type: String, default: '' },
  documento: { type: String, default: '' },
})

const emit = defineEmits(['imprimir', 'validar'])
</script>

<template>
  <section class="hero-perfil glass-dark-hero">
    <div class="hero-glow hero-glow--verde" aria-hidden="true" />
    <div class="hero-glow hero-glow--azul" aria-hidden="true" />
    <q-icon name="biotech" class="hero-watermark" aria-hidden="true" />

    <div class="hero-contenido">
      <div class="hero-izquierda">
        <div class="hero-avatar-wrap">
          <div class="hero-avatar">{{ iniciales }}</div>
          <span class="hero-avatar__check" title="Perfil verificado">
            <q-icon name="verified" size="15px" />
          </span>
        </div>

        <div class="hero-datos">
          <div class="hero-badges">
            <span class="badge badge--estado">
              <span class="punto" /> {{ activo ? 'Activo' : 'Inactivo' }}
            </span>
            <span v-if="esSena" class="badge badge--sena">
              <q-icon name="star" size="14px" /> A1 — SENA
            </span>
            <span class="badge badge--tipo">{{ tipoUsuario || 'Usuario' }}</span>
            <span v-if="rol" class="badge badge--rol">
              <q-icon name="verified" size="13px" /> {{ rol }}
            </span>
          </div>

          <h1 class="hero-nombre">{{ nombre }}</h1>

          <div class="hero-meta">
            <span class="hero-meta__rol">
              <q-icon name="biotech" size="16px" />
              {{ rol || 'Sin rol activo' }}
            </span>
            <span v-if="institucion" class="hero-meta__sep">•</span>
            <span v-if="institucion" class="hero-meta__institucion">{{ institucion }}</span>
            <span v-if="documento" class="hero-id">ID: {{ documento }}</span>
          </div>
        </div>
      </div>

      <div class="hero-acciones">
        <button type="button" class="hero-btn hero-btn--ghost" @click="emit('imprimir')">
          <q-icon name="download" size="18px" />
          <span>Descargar ficha PDF</span>
        </button>
        <button type="button" class="hero-btn hero-btn--verde" @click="emit('validar')">
          <q-icon name="verified_user" size="18px" />
          <span>Validar credenciales</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-perfil {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  padding: 28px;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: var(--shadow-floating, 0 20px 45px -15px rgba(11, 34, 56, 0.25));
}

.hero-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  pointer-events: none;
}
.hero-glow--verde {
  width: 384px;
  height: 384px;
  top: -96px;
  right: -96px;
  background: rgba(57, 169, 0, 0.1);
}
.hero-glow--azul {
  width: 320px;
  height: 320px;
  bottom: -80px;
  left: 33%;
  background: rgba(14, 165, 233, 0.1);
}
.hero-watermark {
  position: absolute;
  right: 24px;
  bottom: 16px;
  font-size: 260px;
  line-height: 1;
  opacity: 0.04;
  pointer-events: none;
  user-select: none;
}

.hero-contenido {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.hero-izquierda {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.hero-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}
.hero-avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  font-weight: 900;
  letter-spacing: -0.5px;
  color: #fff;
  background: linear-gradient(135deg, #061524, #102a45);
  border: 2px solid #fff;
  box-shadow: 0 0 0 4px #39a900, 0 12px 30px -12px rgba(0, 0, 0, 0.5);
}
.hero-avatar__check {
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #39a900;
  color: #fff;
  border: 2px solid #0b2238;
}

.hero-datos {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hero-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  backdrop-filter: blur(8px);
}
.badge--estado {
  background: rgba(16, 185, 129, 0.15);
  color: #6ee7b7;
  border: 1px solid rgba(52, 211, 153, 0.28);
}
.badge--sena {
  background: rgba(245, 158, 11, 0.2);
  color: #fcd34d;
  border: 1px solid rgba(251, 191, 36, 0.3);
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
}
.badge--tipo {
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.badge--rol {
  background: rgba(14, 165, 233, 0.2);
  color: #bae6fd;
  border: 1px solid rgba(56, 189, 248, 0.25);
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
}

.punto {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #6fdf43;
  animation: latido 2s ease-in-out infinite;
}
@keyframes latido {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

.hero-nombre {
  margin: 0;
  font-size: clamp(1.4rem, 2.4vw, 1.9rem);
  font-weight: 800;
  letter-spacing: -0.4px;
  color: #fff;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  font-size: 13px;
  font-weight: 300;
  color: #cbd5e1;
}

.hero-meta__rol {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #6fdf43;
  font-weight: 600;
}

.hero-meta__sep {
  color: #64748b;
}

.hero-id {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
}

.hero-acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.hero-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 16px;
  border: none;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
}
.hero-btn--ghost {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
}
.hero-btn--ghost:hover { background: rgba(255, 255, 255, 0.16); }
.hero-btn--verde {
  background: #39a900;
  color: #fff;
  box-shadow: 0 4px 18px rgba(57, 169, 0, 0.35);
}
.hero-btn--verde:hover { background: #46c503; }
.hero-btn:active { transform: scale(0.97); }

@media (max-width: 599px) {
  .hero-perfil { padding: 20px; }
  .hero-avatar { width: 72px; height: 72px; font-size: 24px; }
  .hero-watermark { font-size: 180px; }
}
@media print {
  .hero-acciones { display: none !important; }
}
</style>
