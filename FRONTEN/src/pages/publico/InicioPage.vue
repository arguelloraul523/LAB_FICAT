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
            <div class="text-h6 text-navy text-weight-bold q-mt-sm">LABFICAT</div>
            <div class="text-caption text-grey-7">Análisis fisicoquímicos de alimentos</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== CONTADORES ===== -->
    <section class="contadores">
      <div class="contadores-inner">
        <div class="contador">
          <div class="contador-numero">{{ catalogo.total }}</div>
          <div class="contador-etiqueta">Exámenes disponibles</div>
        </div>
        <div class="contador">
          <div class="contador-numero">{{ catalogo.categorias.length }}</div>
          <div class="contador-etiqueta">Categorías de análisis</div>
        </div>
        <div class="contador">
          <div class="contador-numero">{{ catalogo.tiposMuestra.length }}</div>
          <div class="contador-etiqueta">Tipos de muestra</div>
        </div>
        <div class="contador">
          <div class="contador-numero">A1</div>
          <div class="contador-etiqueta">Prioridad SENA</div>
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
              <strong>LABFICAT</strong> es el Laboratorio de Caracterización Fisicoquímica de Alimentos del
              <strong>Centro Agroturístico de San Gil</strong>, sede del Servicio Nacional de Aprendizaje ubicada en
              <strong>San Gil, Santander</strong>. Nos especializamos en el <strong>análisis de productos orgánicos</strong>
              y muestras agroindustriales, ofreciendo servicios de calidad con respaldo institucional.
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

    <!-- ===== ¿CÓMO FUNCIONA? ===== -->
    <section id="como-funciona" class="seccion como-funciona">
      <div class="seccion-inner">
        <div class="text-center q-mb-lg">
          <div class="seccion-etiqueta">Proceso</div>
          <h3 class="seccion-titulo">¿Cómo funciona?</h3>
          <p class="seccion-sub">Solo 6 pasos para llevar a cabo tu análisis de laboratorio.</p>
        </div>
        <div class="pasos-grid">
          <div v-for="(p, i) in pasos" :key="i" class="paso">
            <div class="paso-numero">{{ i + 1 }}</div>
            <q-icon :name="p.icon" color="primary" size="2rem" />
            <div class="paso-titulo">{{ p.titulo }}</div>
            <div class="paso-desc">{{ p.desc }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== BENEFICIOS SENA ===== -->
    <section class="seccion beneficios">
      <div class="seccion-inner">
        <div class="text-center q-mb-lg">
          <div class="seccion-etiqueta">Beneficios</div>
          <h3 class="seccion-titulo">¿Por qué el SENA?</h3>
        </div>
        <div class="row q-col-gutter-md">
          <div v-for="b in beneficios" :key="b.titulo" class="col-12 col-sm-6 col-md-3">
            <div class="beneficio">
              <q-icon :name="b.icon" color="primary" size="2.5rem" />
              <div class="beneficio-titulo">{{ b.titulo }}</div>
              <div class="beneficio-desc">{{ b.desc }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== CATEGORÍAS DE ANÁLISIS ===== -->
    <section class="seccion categorias">
      <div class="seccion-inner">
        <div class="text-center q-mb-lg">
          <div class="seccion-etiqueta">Categorías</div>
          <h3 class="seccion-titulo">Categorías de análisis</h3>
        </div>
        <div v-if="catalogo.categorias.length" class="row q-col-gutter-md">
          <div v-for="c in catalogo.categorias" :key="c._id" class="col-6 col-md-3">
            <div class="categoria-card">
              <q-icon name="science" color="primary" size="2rem" />
              <div class="categoria-nombre">{{ c.nombre }}</div>
            </div>
          </div>
        </div>
        <div v-else class="text-center text-grey-6 q-pa-md">Cargando categorías...</div>
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
            @update:model-value="buscar"
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

    <!-- ===== CTA FINAL ===== -->
    <section class="cta-final">
      <div class="cta-final-inner">
        <h3 class="cta-titulo">¿Listo para solicitar tu análisis?</h3>
        <p class="cta-sub">Regístrate y empieza a gestionar tus análisis de laboratorio en línea.</p>
        <div class="cta-botones">
          <router-link to="/registro" class="boton boton-solid">Registrarse</router-link>
          <router-link to="/login" class="boton boton-navy">Iniciar sesión</router-link>
        </div>
      </div>
    </section>

    <!-- ===== FOOTER ===== -->
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-col">
          <div class="footer-titulo">LABFICAT — Caracterización Fisicoquímica de Alimentos</div>
          <div class="footer-sub">Centro Agroturístico de San Gil</div>
        </div>
        <div class="footer-col">
          <div class="footer-item"><q-icon name="mail" size="1rem" /> labficat@sena.edu.co</div>
          <div class="footer-item"><q-icon name="phone" size="1rem" /> +57 300 000 0000</div>
          <div class="footer-item"><q-icon name="location_on" size="1rem" /> San Gil, Santander — Colombia</div>
        </div>
        <div class="footer-col footer-social">
          <a href="#" class="social" aria-label="Facebook" title="Facebook">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"/></svg>
          </a>
          <a href="#" class="social" aria-label="Instagram" title="Instagram">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2 0 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2 0 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3 0-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2 0-1.3-.1-1.7-.1-4.9s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4 1.3 0 1.7-.1 4.9-.1zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm5.2-8.3a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z"/></svg>
          </a>
          <a href="#" class="social" aria-label="X" title="X">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.9 2H22l-6.8 7.8L23 22h-6.3l-4.9-6.4L6.2 22H3l7.3-8.3L2 2h6.4l4.4 5.9L18.9 2zm-1.1 18h1.7L7.1 3.9H5.3L17.8 20z"/></svg>
          </a>
          <a href="#" class="social" aria-label="YouTube" title="YouTube">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.5 15.5v-7L15.5 12l-6 3.5z"/></svg>
          </a>
        </div>
      </div>
      <div class="footer-bottom">© 2026 SENA — Servicio Nacional de Aprendizaje</div>
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
  { icon: 'account_balance', titulo: 'Centro Agroturístico (CAT)', desc: 'Sede del SENA en San Gil, Santander, enfocada en formación agroindustrial y turística.' },
  { icon: 'science', titulo: 'Nuestro laboratorio', desc: 'Análisis de productos orgánicos con trazabilidad completa.' },
  { icon: 'biotech', titulo: 'Qué hacemos', desc: 'Ensayos fisicoquímicos y microbiológicos, cotización y seguimiento en línea.' },
  { icon: 'verified', titulo: 'Compromiso SENA', desc: 'Aprendices con prioridad A1 y tarifa exonerada.' },
]

const pasos = [
  { icon: 'person_add', titulo: 'Regístrate', desc: 'Crea tu cuenta con tu correo.' },
  { icon: 'description', titulo: 'Pre-solicitud', desc: 'Describe tu muestra y recibe sugerencias de análisis.' },
  { icon: 'draw', titulo: 'Cotización y firma', desc: 'Revisa tu cotización y fírmala digitalmente.' },
  { icon: 'payments', titulo: 'Pago', desc: 'Reporta tu comprobante y espera la verificación.' },
  { icon: 'inbox', titulo: 'Recepción', desc: 'Entrega tu muestra con prioridad A1/A2.' },
  { icon: 'assignment_turned_in', titulo: 'Informe', desc: 'Descarga tus resultados tras la encuesta.' },
]

const beneficios = [
  { icon: 'workspace_premium', titulo: 'Prioridad A1', desc: 'Aprendices y personal SENA atendidos primero.' },
  { icon: 'savings', titulo: 'Cotización $0', desc: 'Tarifa exonerada para SENA verificado.' },
  { icon: 'timeline', titulo: 'Trazabilidad en línea', desc: 'Sigue el avance de tu muestra en tiempo real.' },
  { icon: 'visibility_off', titulo: 'Código ciego', desc: 'Imparcialidad garantizada en cada análisis.' },
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

// Carga inicial: exámenes + categorías + tipos de muestra (para contadores y cards).
async function cargar() {
  try {
    await Promise.all([
      catalogo.listarExamenes({ q: filtros.q || undefined }),
      catalogo.listarCategorias(),
      catalogo.listarTiposMuestra(),
    ])
  } catch (e) {
    mensajeError(e, 'No se pudo cargar el catálogo')
  }
}

// Búsqueda: solo recarga los exámenes.
async function buscar() {
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
.servicios { background: #ffffff; }
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

.seccion-sub { color: #6b7280; margin-top: 8px; }

/* ===== Contadores ===== */
.contadores {
  background: linear-gradient(135deg, #39a900 0%, #2d8700 100%);
  padding: 40px 24px;
}
.contadores-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
  gap: 24px;
  text-align: center;
}
.contador-numero { font-size: 2.5rem; font-weight: 800; color: #ffffff; }
.contador-etiqueta { color: #e8f5e0; font-size: 0.9rem; font-weight: 600; }

/* ===== ¿Cómo funciona? ===== */
.como-funciona { background: #f5f7fa; }
.pasos-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
}
.paso {
  background: #ffffff;
  border: 1px solid #eef1f4;
  border-radius: 12px;
  padding: 24px 16px;
  text-align: center;
  position: relative;
  height: 100%;
}
.paso-numero {
  position: absolute;
  top: 12px;
  right: 14px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #39a900;
  color: #fff;
  font-weight: 700;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.paso-titulo { font-weight: 700; color: #00324d; margin-top: 12px; }
.paso-desc { color: #6b7280; font-size: 0.8rem; margin-top: 6px; line-height: 1.4; }

/* ===== Beneficios ===== */
.beneficios { background: #ffffff; }
.beneficio {
  background: #f9fafb;
  border: 1px solid #eef1f4;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  height: 100%;
}
.beneficio-titulo { font-weight: 700; color: #00324d; margin-top: 12px; }
.beneficio-desc { color: #6b7280; font-size: 0.85rem; margin-top: 6px; }

/* ===== Categorías ===== */
.categorias { background: #f5f7fa; }
.categoria-card {
  background: #ffffff;
  border: 1px solid #eef1f4;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  height: 100%;
  transition: all 0.2s;
}
.categoria-card:hover { border-color: #39a900; box-shadow: 0 4px 12px rgba(57, 169, 0, 0.12); }
.categoria-nombre { font-weight: 600; color: #1f2937; margin-top: 8px; font-size: 0.9rem; }

/* ===== CTA final ===== */
.cta-final { background: #00324d; padding: 64px 24px; text-align: center; }
.cta-final-inner { max-width: 700px; margin: 0 auto; }
.cta-titulo { font-size: 2rem; font-weight: 800; color: #ffffff; margin: 0; }
.cta-sub { color: #cbd5e1; margin-top: 12px; }
.cta-botones { display: flex; justify-content: center; gap: 16px; margin-top: 24px; flex-wrap: wrap; }

/* ===== Footer ===== */
.footer { background: #00324d; color: #cbd5e1; }
.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px 24px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 32px;
  font-size: 0.85rem;
}
.footer-col { display: flex; flex-direction: column; gap: 10px; }
.footer-titulo { font-weight: 800; font-size: 1.05rem; color: #ffffff; }
.footer-sub { color: #9fb3c8; }
.footer-item { display: flex; align-items: center; gap: 8px; color: #cbd5e1; }
.footer-item .q-icon { color: #39a900; }
.footer-social { flex-direction: row; gap: 12px; }
.social {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  transition: all 0.2s;
}
.social:hover { background: #39a900; transform: translateY(-2px); }
.footer-bottom {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  text-align: center;
  color: #9fb3c8;
  font-size: 0.8rem;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .nav-links { display: none; }
  .hero-inner { grid-template-columns: 1fr; padding: 48px 20px; }
  .hero-titulo { font-size: 2rem; }
  .logo-sub { display: none; }
  .pasos-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .pasos-grid { grid-template-columns: 1fr; }
}
</style>
