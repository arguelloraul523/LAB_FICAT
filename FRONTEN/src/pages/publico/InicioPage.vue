<template>
  <div class="landing">
    <!-- ===== HEADER (Institucional SENA) ===== -->
    <header class="header-sena">
      <div class="header-inner">
        <!-- Logo -->
        <div class="logo row items-center no-wrap" @click="irInicio">
          <div class="logo-circulo flex flex-center">
            <svg viewBox="0 0 24 24" class="logo-svg">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div class="logo-texto">
            <span class="logo-sena">SENA</span>
            <span class="logo-sub">Servicio Nacional de Aprendizaje</span>
          </div>
        </div>

        <!-- Navegación -->
        <nav class="nav-links">
          <a href="#inicio" class="nav-link activo">Inicio</a>
          <a href="#quienes" class="nav-link">¿Quiénes somos?</a>
          <a href="#servicios" class="nav-link">Servicios</a>
        </nav>

        <!-- CTA -->
        <div class="cta-buttons">
          <router-link to="/registro" class="boton boton-outline">Registrarse</router-link>
          <router-link to="/login" class="boton boton-solid">Iniciar sesión</router-link>
        </div>
      </div>
    </header>

    <!-- ===== HERO ===== -->
    <section id="inicio" class="hero">
      <div class="hero-inner">
        <div class="hero-texto">
          <div class="hero-badge">
            <q-icon name="workspace_premium" size="1rem" />
            <span>Portal Oficial del Laboratorio</span>
          </div>
          <h2 class="hero-titulo">
            Análisis de laboratorio con el <span class="text-sena">SENA</span>
          </h2>
          <p class="hero-parrafo">
            Accede a nuestro catálogo de ensayos y análisis, cotiza en línea y haz seguimiento
            a tus muestras en un solo lugar. Transforma tus competencias para el mundo laboral.
          </p>
          <div class="hero-botones">
            <button class="boton boton-navy" @click="irServicios">Explorar servicios</button>
            <button class="boton boton-outline" @click="irQuienes">Conocer más</button>
          </div>
        </div>

        <div class="hero-imagen">
          <div class="hero-card">
            <q-icon name="science" size="5rem" color="primary" />
            <div class="text-h6 text-navy text-weight-bold q-mt-sm">Laboratorio SENA</div>
            <div class="text-caption text-grey-7">Análisis fisicoquímicos, microbiológicos y más</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== ¿QUIÉNES SOMOS? ===== -->
    <section id="quienes" class="seccion quienes">
      <div class="seccion-inner">
        <div class="text-center q-mb-lg">
          <div class="seccion-etiqueta">¿Quiénes somos?</div>
          <h3 class="seccion-titulo">El laboratorio del SENA a tu servicio</h3>
        </div>
        <div class="row q-col-gutter-lg items-center">
          <div class="col-12 col-md-6">
            <p class="quienes-texto">
              Somos el laboratorio de análisis del <strong>Servicio Nacional de Aprendizaje</strong>,
              comprometidos con ofrecer servicios de análisis de muestras (aguas, suelos, alimentos y más)
              a la comunidad, con rigor técnico y calidad institucional.
            </p>
            <p class="quienes-texto">
              Los aprendices y personal SENA cuentan con <strong>prioridad A1</strong> y tarifa exonerada,
              mientras que los clientes externos acceden a un proceso ágil de cotización, pago y seguimiento.
            </p>
          </div>
          <div class="col-12 col-md-6">
            <div class="row q-col-gutter-md">
              <div class="col-6" v-for="f in fortalezas" :key="f.titulo">
                <div class="fortaleza">
                  <q-icon :name="f.icon" color="primary" size="2rem" />
                  <div class="text-subtitle1 text-weight-bold q-mt-sm">{{ f.titulo }}</div>
                  <div class="text-caption text-grey-7">{{ f.desc }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== SERVICIOS (Catálogo) ===== -->
    <section id="servicios" class="seccion servicios">
      <div class="seccion-inner">
        <div class="row items-center justify-between q-mb-md">
          <div>
            <div class="seccion-etiqueta">Servicios</div>
            <h3 class="seccion-titulo">Catálogo de exámenes</h3>
          </div>
          <q-input
            v-model="filtros.q"
            outlined
            dense
            debounce="400"
            placeholder="Buscar análisis..."
            class="col-12 col-md-4"
            clearable
            @update:model-value="cargar"
          >
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </div>

        <div v-if="catalogo.cargando" class="row justify-center q-pa-lg">
          <q-spinner color="primary" size="3em" />
        </div>

        <div v-else-if="!catalogo.examenes.length" class="text-center q-pa-xl text-grey-7">
          <q-icon name="science" size="4em" color="grey-4" />
          <div class="q-mt-sm">No hay exámenes que coincidan con la búsqueda.</div>
        </div>

        <div v-else class="row q-col-gutter-md">
          <div v-for="ex in catalogo.examenes" :key="ex._id" class="col-12 col-sm-6 col-md-4">
            <q-card class="card-suave q-pa-md full-height">
              <q-card-section>
                <div class="row items-center justify-between">
                  <div class="text-subtitle1 text-weight-bold">{{ ex.nombre }}</div>
                  <q-badge color="primary" text-color="white">{{ formatoCOP(ex.precio) }}</q-badge>
                </div>
                <div class="text-caption text-grey-7 q-mt-sm">{{ ex.descripcion || 'Sin descripción' }}</div>
                <div class="q-mt-sm text-caption">
                  <span class="text-grey-6">Categoría:</span> {{ ex.categoria?.nombre || '—' }}
                </div>
                <div class="text-caption">
                  <span class="text-grey-6">Matriz:</span> {{ ex.tipoMuestra?.nombre || '—' }}
                </div>
                <div class="text-caption">
                  <span class="text-grey-6">Respuesta:</span> {{ ex.tiempoRespuestaDias }} día(s)
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== FOOTER ===== -->
    <footer class="footer">
      <div class="footer-inner">
        <span>SENA — Servicio Nacional de Aprendizaje</span>
        <span class="text-grey-5">Sistema de Gestión del Laboratorio</span>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { onMounted, reactive } from 'vue'
import { useCatalogoStore } from 'src/stores/catalogo'
import { mensajeError } from 'src/utils/errores'

const catalogo = useCatalogoStore()
const filtros = reactive({ q: '' })

const fortalezas = [
  { icon: 'science', titulo: 'Calidad técnica', desc: 'Ensayos con rigor y trazabilidad' },
  { icon: 'verified', titulo: 'Exoneración SENA', desc: 'Aprendices con prioridad A1 y $0' },
  { icon: 'speed', titulo: 'Ágil y en línea', desc: 'Cotiza y paga sin filas' },
  { icon: 'track_changes', titulo: 'Seguimiento', desc: 'Avance de tu muestra en tiempo real' },
]

function formatoCOP(v) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0)
}

function irInicio() {
  document.getElementById('inicio')?.scrollIntoView({ behavior: 'smooth' })
}
function irQuienes() {
  document.getElementById('quienes')?.scrollIntoView({ behavior: 'smooth' })
}
function irServicios() {
  document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth' })
}

async function cargar() {
  try {
    await catalogo.listarExamenes({ q: filtros.q || undefined })
  } catch (e) {
    mensajeError(e, 'No se pudo cargar el catálogo')
  }
}

onMounted(cargar)
</script>

<style scoped>
/* ===== Header ===== */
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
  justify-content: space-between;
  gap: 16px;
}
.logo { cursor: pointer; }
.logo-circulo {
  width: 48px;
  height: 48px;
  background: #39a900;
  border-radius: 50%;
  color: #fff;
  box-shadow: 0 2px 6px rgba(57, 169, 0, 0.3);
  border: 2px solid #fff;
  margin-right: 12px;
}
.logo-svg { width: 28px; height: 28px; fill: currentColor; }
.logo-texto { display: flex; flex-direction: column; line-height: 1.1; }
.logo-sena { font-size: 1.2rem; font-weight: 900; color: #00324d; letter-spacing: 1px; }
.logo-sub { font-size: 0.6rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; }

.nav-links { display: flex; align-items: center; gap: 32px; font-weight: 600; font-size: 0.9rem; color: #4b5563; }
.nav-link { text-decoration: none; color: inherit; padding-bottom: 2px; transition: color 0.2s; }
.nav-link:hover { color: #39a900; }
.nav-link.activo { color: #39a900; font-weight: 700; border-bottom: 2px solid #39a900; }

/* ===== Hero ===== */
.hero { background: linear-gradient(to bottom, #f9fafb, #f0f2f5); }
.hero-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: center;
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #e8f5e0;
  color: #39a900;
  font-weight: 700;
  font-size: 0.75rem;
  padding: 6px 12px;
  border-radius: 999px;
}
.hero-titulo { font-size: 2.75rem; font-weight: 800; color: #00324d; line-height: 1.15; margin: 20px 0; }
.hero-parrafo { color: #6b7280; font-size: 1.05rem; line-height: 1.6; }
.hero-botones { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 24px; }

/* ===== Botones (HTML puro, sin depender de q-btn) ===== */
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
}
.boton-solid { background: #39a900; color: #ffffff; }
.boton-solid:hover { background: #2d8700; }
.boton-outline { border-color: #39a900; color: #39a900; background: transparent; }
.boton-outline:hover { background: #39a900; color: #ffffff; }
.boton-navy { background: #00324d; color: #ffffff; }
.boton-navy:hover { background: #0a4a6b; }

.hero-imagen { position: relative; }
.hero-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
}

/* ===== Secciones ===== */
.seccion { padding: 72px 24px; }
.quienes { background: #ffffff; }
.servicios { background: #f5f7fa; }
.seccion-inner { max-width: 1200px; margin: 0 auto; }
.seccion-etiqueta {
  display: inline-block;
  background: #e8f5e0;
  color: #39a900;
  font-weight: 700;
  font-size: 0.75rem;
  padding: 4px 12px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.seccion-titulo { font-size: 1.8rem; font-weight: 800; color: #00324d; margin: 12px 0 0; }
.quienes-texto { color: #6b7280; line-height: 1.7; font-size: 1rem; }
.fortaleza {
  background: #f9fafb;
  border: 1px solid #eef1f4;
  border-radius: 12px;
  padding: 20px;
  height: 100%;
}

/* ===== Footer ===== */
.footer { background: #00324d; color: #cbd5e1; }
.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.85rem;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .nav-links { display: none; }
  .hero-inner { grid-template-columns: 1fr; padding: 48px 20px; }
  .hero-titulo { font-size: 2rem; }
  .logo-sub { display: none; }
}
</style>
