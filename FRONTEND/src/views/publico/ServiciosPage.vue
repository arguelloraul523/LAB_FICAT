<template>
  <div class="servicios-page">
    <HeaderLanding />

    <main class="contenido">
      <!-- ===== CATÁLOGO DE EXÁMENES ===== -->
      <section class="seccion servicios">
        <div class="seccion-inner">
          <div class="row items-center justify-between q-mb-md cabecera">
            <div>
              <div class="seccion-etiqueta">Servicios</div>
              <h1 class="seccion-titulo">Catálogo de exámenes</h1>
            </div>
            <q-input
              v-model="filtros.q"
              outlined
              dense
              debounce="400"
              placeholder="Buscar análisis..."
              class="buscador"
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
                  <div class="text-subtitle1 text-weight-bold">{{ ex.nombre }}</div>
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
    </main>

    <FooterLanding />
  </div>
</template>

<script setup>
import { onMounted, reactive } from 'vue'
import HeaderLanding from '@/components/landing/HeaderLanding.vue'
import FooterLanding from '@/components/landing/FooterLanding.vue'
import { useCatalogoStore } from '@/store/catalogo'
import { useNotificar } from '@/composables/useNotificar'

const { notificarError } = useNotificar()

const catalogo = useCatalogoStore()
const filtros = reactive({ q: '' })

async function cargar() {
  try {
    await catalogo.listarExamenes({ q: filtros.q || undefined })
  } catch (e) {
    notificarError(e, 'No se pudo cargar el catálogo')
  }
}

async function buscar() {
  try {
    await catalogo.listarExamenes({ q: filtros.q || undefined })
  } catch (e) {
    notificarError(e, 'No se pudo cargar el catálogo')
  }
}

onMounted(cargar)
</script>

<style scoped>
.servicios-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}
.contenido { flex: 1 1 auto; }

.seccion { padding: 64px 24px 80px; }
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

.cabecera { gap: 16px; }
.buscador { width: 100%; }

@media (max-width: 768px) {
  .seccion { padding: 40px 20px 56px; }
  .seccion-titulo { font-size: 1.5rem; }
  .buscador { width: 100%; }
}
</style>
