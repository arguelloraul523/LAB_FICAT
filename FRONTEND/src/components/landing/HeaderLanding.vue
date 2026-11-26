<template>
  <header class="header-sena">
    <div class="header-inner">
      <router-link to="/" class="logo row items-center no-wrap" aria-label="Ir al inicio">
        <div class="logo-circulo flex flex-center">
          <svg viewBox="0 0 24 24" class="logo-svg">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div class="logo-texto">
          <span class="logo-sena">SENA</span>
          <span class="logo-sub">Servicio Nacional de Aprendizaje</span>
        </div>
      </router-link>

      <div class="header-right">
        <nav class="nav-links" aria-label="Navegación principal">
          <router-link to="/" class="nav-link" :class="{ activo: route.name === 'inicio' }">Inicio</router-link>
          <a href="#quienes" class="nav-link" @click.prevent="irQuienes">¿Quiénes somos?</a>
          <router-link to="/servicios" class="nav-link" :class="{ activo: route.name === 'servicios' }">Servicios</router-link>
        </nav>

        <div class="cta-buttons">
          <router-link to="/registro" class="boton boton-outline">Registrarse</router-link>
          <router-link to="/login" class="boton boton-solid">Iniciar sesión</router-link>
        </div>
      </div>

      <button
        class="hamburger"
        type="button"
        aria-label="Abrir menú"
        :aria-expanded="menuAbierto"
        @click="menuAbierto = !menuAbierto"
      >
        <span class="hamburger-line" :class="{ 'is-open': menuAbierto }" />
        <span class="hamburger-line" :class="{ 'is-open': menuAbierto }" />
        <span class="hamburger-line" :class="{ 'is-open': menuAbierto }" />
      </button>
    </div>

    <transition name="menu">
      <div v-if="menuAbierto" class="mobile-menu">
        <router-link to="/" class="mobile-link" :class="{ activo: route.name === 'inicio' }" @click="cerrarMenu">
          Inicio
        </router-link>
        <a href="#quienes" class="mobile-link" @click.prevent="irQuienes">¿Quiénes somos?</a>
        <router-link to="/servicios" class="mobile-link" :class="{ activo: route.name === 'servicios' }" @click="cerrarMenu">
          Servicios
        </router-link>
        <div class="mobile-cta">
          <router-link to="/registro" class="boton boton-outline" @click="cerrarMenu">Registrarse</router-link>
          <router-link to="/login" class="boton boton-solid" @click="cerrarMenu">Iniciar sesión</router-link>
        </div>
      </div>
    </transition>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const menuAbierto = ref(false)

function cerrarMenu() {
  menuAbierto.value = false
}

function irQuienes() {
  cerrarMenu()
  if (route.name === 'inicio') {
    document.getElementById('quienes')?.scrollIntoView({ behavior: 'smooth' })
  } else {
    router.push({ name: 'inicio' }).then(() => {
      setTimeout(() => document.getElementById('quienes')?.scrollIntoView({ behavior: 'smooth' }), 80)
    })
  }
}
</script>

<style scoped>
.header-sena {
  position: sticky;
  top: 0;
  z-index: 40;
  background: #ffffff;
  border-bottom: 4px solid #39a900;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 80px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo { cursor: pointer; text-decoration: none; }
.logo-circulo {
  width: 48px;
  height: 48px;
  background: #39a900;
  border-radius: 50%;
  color: #fff;
  box-shadow: 0 2px 6px rgba(57, 169, 0, 0.3);
  border: 2px solid #fff;
  margin-right: 12px;
  flex-shrink: 0;
}
.logo-svg { width: 28px; height: 28px; fill: currentColor; }
.logo-texto { display: flex; flex-direction: column; line-height: 1.1; }
.logo-sena { font-size: 1.2rem; font-weight: 900; color: #00324d; letter-spacing: 1px; }
.logo-sub { font-size: 0.6rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; }

/* Navegación + CTA agrupadas a la derecha, con poco espacio entre ellas. */
.header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 28px;
}

.nav-links { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.9rem; color: #4b5563; }
.nav-link {
  text-decoration: none;
  color: inherit;
  padding: 8px 16px;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.2s;
}
.nav-link:hover { color: #39a900; border-color: #39a900; background: #f0f9ec; }
.nav-link.activo { color: #39a900; font-weight: 700; border-color: #39a900; background: #eaf5e4; }

.cta-buttons { display: flex; align-items: center; gap: 12px; }
.boton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  padding: 10px 22px;
  border-radius: 6px;
  text-decoration: none;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
  font-family: inherit;
  white-space: nowrap;
}
.boton-solid { background: #39a900; color: #ffffff; }
.boton-solid:hover { background: #2d8700; }
.boton-outline { border-color: #39a900; color: #39a900; background: transparent; }
.boton-outline:hover { background: #39a900; color: #ffffff; }

/* ---- Hamburguesa (móvil) ---- */
.hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 44px;
  height: 44px;
  padding: 10px;
  margin-left: auto;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.hamburger-line {
  display: block;
  height: 2px;
  width: 100%;
  background: #00324d;
  border-radius: 2px;
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.hamburger-line.is-open:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.hamburger-line.is-open:nth-child(2) { opacity: 0; }
.hamburger-line.is-open:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

/* ---- Menú móvil ---- */
.mobile-menu {
  display: none;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px 16px;
  border-top: 1px solid #eef1f4;
  background: #ffffff;
}
.mobile-link {
  text-decoration: none;
  color: #4b5563;
  font-weight: 600;
  font-size: 1rem;
  padding: 12px 12px;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.2s;
}
.mobile-link:hover { color: #39a900; background: #f0f9ec; }
.mobile-link.activo { color: #39a900; font-weight: 700; border-color: #39a900; background: #eaf5e4; }
.mobile-cta {
  display: flex;
  gap: 12px;
  padding: 12px 12px 4px;
}
.mobile-cta .boton { flex: 1; }

.menu-enter-active,
.menu-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.menu-enter-from,
.menu-leave-to { opacity: 0; transform: translateY(-8px); }

@media (max-width: 768px) {
  .header-right { display: none; }
  .hamburger { display: flex; }
  .mobile-menu { display: flex; }
  .header-inner { height: 68px; padding: 0 16px; }
  .logo-circulo { width: 40px; height: 40px; margin-right: 10px; }
  .logo-svg { width: 24px; height: 24px; }
  .logo-sena { font-size: 1rem; }
  .logo-sub { display: none; }
}

@media (max-width: 430px) {
  .header-inner { height: 62px; padding: 0 12px; }
  .logo-circulo { width: 36px; height: 36px; margin-right: 8px; }
  .logo-sena { font-size: 0.95rem; letter-spacing: 0.5px; }
}
</style>
