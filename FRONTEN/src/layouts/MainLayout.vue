<template>
  <q-layout view="lHh LpR lFf">
    <!-- ===== Header (verde SENA) ===== -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menú" @click="drawer = !drawer" />

        <q-toolbar-title class="row items-center q-gutter-x-sm no-wrap">
          <q-icon name="science" size="sm" />
          <span class="text-weight-bold">LABFICAT</span>
        </q-toolbar-title>

        <!-- Rol activo (multirrol) -->
        <q-select
          v-if="rolesDisponibles.length > 1"
          v-model="rolActivoId"
          dense
          outlined
          dark
          color="white"
          class="q-mr-sm"
          style="min-width: 150px"
          :options="rolesDisponibles"
          option-label="nombre"
          option-value="_id"
          label="Rol"
          @update:model-value="cambiarRol"
        />

        <q-badge color="accent" text-color="dark" class="q-mr-sm" :label="auth.rol || 'Sin rol'" />

        <q-btn flat round dense icon="logout" aria-label="Salir" @click="salir">
          <q-tooltip>Cerrar sesión</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- ===== Drawer / menú ===== -->
    <q-drawer v-model="drawer" show-if-above :width="240" bordered class="bg-white">
      <div class="q-pa-md">
        <div class="text-h6 text-sena text-weight-bold">LABFICAT</div>
        <div class="text-caption text-grey-7">Laboratorio de Alimentos</div>
      </div>
      <q-separator />

      <q-list padding>
        <q-item v-for="item in menu" :key="item.name" clickable :to="{ name: item.name }" active-class="menu-activo" v-ripple>
          <q-item-section avatar>
            <q-icon :name="item.icon" color="primary" />
          </q-item-section>
          <q-item-section>{{ item.label }}</q-item-section>
        </q-item>
      </q-list>

      <q-separator />
      <div class="q-pa-md">
        <div class="text-caption text-grey-7">{{ auth.nombres }}</div>
        <div class="text-caption text-grey-5">{{ auth.correo }}</div>
        <q-badge v-if="auth.esSena" color="accent" text-color="dark" class="q-mt-sm" label="Prioridad A1 (SENA)" />
      </div>
    </q-drawer>

    <q-page-container>
      <q-page class="q-pa-md bg-pastel">
        <router-view />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/auth'

const $q = useQuasar()
const router = useRouter()
const auth = useAuthStore()

const drawer = ref(false)

// Menú completo del sistema; se filtra según el rol activo.
const MENU = [
  { name: 'panel', label: 'Inicio', icon: 'home', roles: ['Administrador', 'Recepcionista', 'Analista', 'Cliente'] },
  { name: 'dashboard', label: 'Dashboard', icon: 'dashboard', roles: ['Administrador', 'Recepcionista'] },
  { name: 'solicitudes', label: 'Solicitudes', icon: 'description', roles: ['Administrador', 'Recepcionista', 'Cliente'] },
  { name: 'cotizaciones', label: 'Cotizaciones', icon: 'request_quote', roles: ['Administrador', 'Recepcionista', 'Cliente'] },
  { name: 'pagos', label: 'Mis pagos', icon: 'payments', roles: ['Cliente'] },
  { name: 'muestras', label: 'Mis muestras', icon: 'biotech', roles: ['Cliente'] },
  { name: 'recepcion', label: 'Recepción', icon: 'inbox', roles: ['Administrador', 'Recepcionista'] },
  { name: 'muestras-admin', label: 'Muestras (gestión)', icon: 'biotech', roles: ['Administrador', 'Recepcionista'] },
  { name: 'cola', label: 'Cola del día', icon: 'format_list_numbered', roles: ['Administrador', 'Recepcionista', 'Analista'] },
  { name: 'usuarios', label: 'Usuarios', icon: 'group', roles: ['Administrador'] },
  { name: 'verificaciones', label: 'Verificación SENA', icon: 'verified', roles: ['Administrador'] },
  { name: 'catalogo-admin', label: 'Catálogo', icon: 'science', roles: ['Administrador'] },
  { name: 'reportes', label: 'Reportes', icon: 'bar_chart', roles: ['Administrador'] },
]

const menu = computed(() => MENU.filter((m) => m.roles.includes(auth.rol)))

// Roles disponibles para el multirrol.
const rolesDisponibles = computed(() => auth.user?.roles || [])
const rolActivoId = ref(auth.user?.rol?._id || '')

async function cambiarRol(rolId) {
  try {
    await auth.cambiarRol(rolId)
    $q.notify({ type: 'positive', message: 'Rol cambiado', position: 'top' })
  } catch (e) {
    /* el interceptor o el notify ya informan */
  }
}

function salir() {
  auth.logout()
  router.push({ name: 'login' })
}
</script>

<style scoped>
.menu-activo {
  background: #eaf5e4;
  color: #2e7d32;
  font-weight: 600;
}
</style>
