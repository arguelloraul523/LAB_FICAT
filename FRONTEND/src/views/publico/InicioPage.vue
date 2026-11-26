<template>
  <div class="landing">
    <HeaderLanding />

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
        <div class="row q-col-gutter-md justify-center">
          <div v-for="b in beneficios" :key="b.titulo" class="col-12 col-sm-6 col-md-4">
            <div class="beneficio">
              <q-icon :name="b.icon" color="primary" size="2.5rem" />
              <div class="beneficio-titulo">{{ b.titulo }}</div>
              <div class="beneficio-desc">{{ b.desc }}</div>
            </div>
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

    <FooterLanding />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import HeaderLanding from '@/components/landing/HeaderLanding.vue'
import FooterLanding from '@/components/landing/FooterLanding.vue'

const router = useRouter()

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
]

function irQuienes() {
  document.getElementById('quienes')?.scrollIntoView({ behavior: 'smooth' })
}
function irServicios() {
  router.push({ name: 'servicios' })
}
</script>

<style scoped>
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

/* ===== Botones ===== */
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

/* ===== CTA final ===== */
.cta-final { background: #00324d; padding: 64px 24px; text-align: center; }
.cta-final-inner { max-width: 700px; margin: 0 auto; }
.cta-titulo { font-size: 2rem; font-weight: 800; color: #ffffff; margin: 0; }
.cta-sub { color: #cbd5e1; margin-top: 12px; }
.cta-botones { display: flex; justify-content: center; gap: 16px; margin-top: 24px; flex-wrap: wrap; }

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .hero-inner { grid-template-columns: 1fr; padding: 48px 20px; }
  .hero-titulo { font-size: 2rem; }
  .pasos-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .pasos-grid { grid-template-columns: 1fr; }
}
</style>
