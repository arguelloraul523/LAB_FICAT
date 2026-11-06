<template>
  <div>
    <!-- Hero con la paleta del laboratorio -->
    <div class="hero-panel q-mb-md">
      <div class="row items-center justify-between">
        <div>
          <div class="text-h5 text-weight-bold text-white">Hola, {{ auth.nombres || 'bienvenido' }} 👋</div>
          <div class="text-subtitle2 q-mt-xs" style="color: rgba(255,255,255,0.85)">
            Rol activo: <span class="text-weight-bold">{{ auth.rol }}</span>
            <span v-if="auth.rol === 'Cliente'" class="q-ml-sm">
              · {{ auth.esSena ? 'SENA (sin cobro)' : 'Externo (con cobro)' }}
            </span>
          </div>
        </div>
        <q-btn flat color="white" icon="person" label="Mi perfil" no-caps @click="$router.push({ name: 'perfil' })" />
      </div>
    </div>

    <div class="text-subtitle1 text-weight-bold text-navy q-mb-sm">Accesos rápidos</div>
    <div class="row q-col-gutter-md">
      <div v-for="a in acciones" :key="a.name" class="col-12 col-sm-6 col-md-3">
        <q-card class="card-suave cursor-pointer full-height tarjeta-accion" flat bordered @click="$router.push({ name: a.name })">
          <q-card-section class="text-center">
            <div class="icono-accion">
              <q-icon :name="a.icon" color="primary" size="2.2em" />
            </div>
            <div class="text-subtitle1 text-weight-bold q-mt-sm text-navy">{{ a.label }}</div>
            <div class="text-caption text-grey-7 q-mt-xs">{{ a.desc }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from 'src/stores/auth'

const auth = useAuthStore()

const ACCIONES = {
  Cliente: [
    { name: 'solicitudes', label: 'Solicitudes', icon: 'description', desc: 'Crea y consulta tus pre-solicitudes' },
    { name: 'cotizaciones', label: 'Cotizaciones', icon: 'request_quote', desc: 'Acepta y firma tus cotizaciones' },
    { name: 'pagos', label: 'Mis pagos', icon: 'payments', desc: 'Reporta comprobantes y revisa el estado' },
    { name: 'muestras', label: 'Mis muestras', icon: 'biotech', desc: 'Sigue el avance de tus análisis' },
  ],
  Administrador: [
    { name: 'recepcion', label: 'Registrar muestras', icon: 'inbox', desc: 'Busca y recibe muestras nuevas' },
    { name: 'muestras-admin', label: 'Muestras y observaciones', icon: 'biotech', desc: 'Cambia etapa, envía observaciones y rechaza' },
    { name: 'cola', label: 'Muestras por analizar', icon: 'format_list_numbered', desc: 'Cola del día (A1 → A2)' },
    { name: 'dashboard', label: 'Dashboard', icon: 'dashboard', desc: 'Panorama general del laboratorio' },
    { name: 'catalogo-admin', label: 'Catálogo', icon: 'science', desc: 'Administra exámenes y precios' },
    { name: 'usuarios', label: 'Usuarios', icon: 'group', desc: 'Gestiona usuarios y roles' },
    { name: 'verificaciones', label: 'Verificación SENA', icon: 'verified', desc: 'Aprueba identidad SENA' },
    { name: 'reportes', label: 'Reportes', icon: 'bar_chart', desc: 'Exporta CSV, Excel y PDF' },
  ],
}

const acciones = computed(() => ACCIONES[auth.rol] || [])
</script>

<style scoped>
.hero-panel {
  background: linear-gradient(135deg, #39a900 0%, #2d8700 45%, #00324d 100%);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 6px 20px rgba(0, 50, 77, 0.25);
}
.icono-accion {
  width: 56px;
  height: 56px;
  margin: 0 auto;
  border-radius: 14px;
  background: #eaf5e4;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tarjeta-accion {
  border-radius: 14px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.tarjeta-accion:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 18px rgba(57, 169, 0, 0.18);
}
</style>
