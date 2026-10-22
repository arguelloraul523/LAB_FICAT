<template>
  <div>
    <div class="text-h5 text-weight-bold q-mb-sm">Hola, {{ auth.nombres || 'bienvenido' }} 👋</div>
    <div class="text-subtitle2 text-grey-7 q-mb-lg">
      Rol activo: <q-badge color="accent" text-color="dark">{{ auth.rol }}</q-badge>
    </div>

    <div class="row q-col-gutter-md">
      <div v-for="a in acciones" :key="a.name" class="col-12 col-sm-6 col-md-3">
        <q-card class="card-suave cursor-pointer full-height" flat bordered @click="$router.push({ name: a.name })">
          <q-card-section class="text-center">
            <q-icon :name="a.icon" color="primary" size="3em" />
            <div class="text-subtitle1 text-weight-bold q-mt-sm">{{ a.label }}</div>
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
  Recepcionista: [
    { name: 'recepcion', label: 'Recepción', icon: 'inbox', desc: 'Busca y recibe muestras' },
    { name: 'cola', label: 'Cola del día', icon: 'format_list_numbered', desc: 'Atención A1 → A2' },
    { name: 'dashboard', label: 'Dashboard', icon: 'dashboard', desc: 'Panorama operativo' },
  ],
  Analista: [
    { name: 'cola', label: 'Cola del día', icon: 'format_list_numbered', desc: 'Muestras en código ciego' },
  ],
  Administrador: [
    { name: 'dashboard', label: 'Dashboard', icon: 'dashboard', desc: 'Panorama general del laboratorio' },
    { name: 'usuarios', label: 'Usuarios', icon: 'group', desc: 'Gestiona usuarios y roles' },
    { name: 'verificaciones', label: 'Verificación SENA', icon: 'verified', desc: 'Aprueba identidad SENA' },
    { name: 'catalogo-admin', label: 'Catálogo', icon: 'science', desc: 'Administra exámenes y precios' },
    { name: 'reportes', label: 'Reportes', icon: 'bar_chart', desc: 'Exporta CSV, Excel y PDF' },
  ],
}

const acciones = computed(() => ACCIONES[auth.rol] || [])
</script>
