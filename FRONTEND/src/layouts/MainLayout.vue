<template>
  <q-layout view="hHh LpR fFf">
    <!-- ===== Barra superior (glass, mockup) ===== -->
    <q-header class="topbar">
      <q-toolbar class="topbar-toolbar">
        <q-btn flat round dense icon="menu" aria-label="Abrir menú" class="lt-md q-mr-sm" @click="drawer = !drawer" />

        <div class="topbar-chip">
          <span class="pulse-wrap">
            <span class="pulse-ping" />
            <span class="pulse-dot" />
          </span>
          <span>Código ciego activo</span>
        </div>

        <span class="topbar-sep gt-sm">•</span>
        <span class="topbar-tagline gt-sm">PORTAL OFICIAL DE LABORATORIO SENA</span>

        <q-space />

        <!-- Rol activo (multirrol) -->
        <q-select
          v-if="rolesDisponibles.length > 1"
          v-model="rolActivoId"
          dense
          outlined
          class="q-mr-md"
          style="min-width: 170px"
          :options="rolesDisponibles"
          option-label="nombre"
          option-value="_id"
          emit-value
          map-options
          label="Rol"
          @update:model-value="cambiarRol"
        />

        <!-- Campana de notificaciones -->
        <q-btn flat dense icon="notifications" aria-label="Notificaciones" class="campana">
          <span v-if="notis.noLeidas" class="campana-punto" />
          <q-menu anchor="bottom right" self="top right" @before-show="cargarNotificaciones">
            <q-list style="min-width: 320px; max-width: 380px">
              <q-item-label header class="text-weight-bold text-secondary">Notificaciones</q-item-label>
              <q-item v-if="!notis.recientes.length">
                <q-item-section class="text-grey-7">No tienes notificaciones.</q-item-section>
              </q-item>
              <q-item v-for="n in notis.recientes" :key="n._id" clickable @click="notis.marcarLeida(n._id)">
                <q-item-section>
                  <q-item-label :class="n.leida ? 'text-grey-7' : 'text-weight-bold'">{{ n.asunto }}</q-item-label>
                  <q-item-label caption lines="2">{{ n.contenido }}</q-item-label>
                </q-item-section>
                <q-item-section v-if="!n.leida" side><q-badge color="accent" rounded /></q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>

        <div class="topbar-divider gt-xs" />

        <div class="topbar-user">
          <div class="topbar-avatar">{{ iniciales }}</div>
          <div class="column topbar-user__txt gt-xs">
            <span class="topbar-user__nombre ellipsis">{{ auth.nombres || 'Usuario' }}</span>
            <span class="topbar-user__rol">{{ auth.rol === 'Administrador' ? 'Personal del laboratorio' : auth.rol }}</span>
          </div>
        </div>
      </q-toolbar>
    </q-header>

    <!-- ===== Menú lateral (navy, mockup) ===== -->
    <q-drawer v-model="drawer" show-if-above :width="260" :breakpoint="1023" class="drawer-sena text-white">
      <div class="column no-wrap full-height drawer-contenido">
        <div class="marca row items-center no-wrap">
          <div class="marca-logo"><q-icon name="biotech" size="24px" color="white" /></div>
          <div class="column marca-texto">
            <div class="row items-center no-wrap">
              <span class="marca-sena">LABFICAT</span>
              <span class="marca-pill">LIMS</span>
            </div>
            <span class="marca-sub">Laboratorio &amp; Ensayos</span>
          </div>
        </div>

        <nav aria-label="Navegación principal" class="col q-mt-md">
          <template v-for="g in grupos" :key="g.titulo">
            <div class="grupo-titulo">{{ g.titulo }}</div>
            <q-item
              v-for="item in g.items"
              :key="item.name"
              clickable
              exact
              :to="{ name: item.name }"
              active-class="nav-activo"
              class="nav-item"
            >
              <q-item-section avatar class="nav-icono"><q-icon :name="item.icon" size="20px" /></q-item-section>
              <q-item-section>{{ item.label }}</q-item-section>
            </q-item>
          </template>
        </nav>

        <div class="calidad-card">
          <span class="calidad-icono"><q-icon name="verified" size="19px" /></span>
          <div class="column calidad-texto">
            <span class="calidad-titulo">ISO/IEC 17025:2017</span>
            <span class="calidad-sub">Acreditado ONAC • 19-LAB</span>
          </div>
        </div>

        <div class="tarjeta-usuario">
          <div class="row items-center no-wrap q-gutter-x-sm tarjeta-fila">
            <div class="avatar">{{ iniciales }}</div>
            <div class="column tarjeta-datos">
              <span class="usuario-nombre" :title="auth.nombres || 'Usuario'">{{ auth.nombres || 'Usuario' }}</span>
              <span class="usuario-rol" :title="auth.rol === 'Administrador' ? 'Personal del laboratorio' : auth.rol">{{ auth.rol === 'Administrador' ? 'Personal del laboratorio' : auth.rol }}</span>
            </div>
          </div>
          <q-btn flat no-caps dense align="left" icon="logout" label="Cerrar sesión" class="btn-salir" @click="salir" />
        </div>
      </div>
    </q-drawer>

    <q-page-container>
      <q-page class="pagina">
        <div class="contenedor">
          <router-view />
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { useNotificacionesStore } from '@/store/notificaciones'
import { useNotificar } from '@/composables/useNotificar'
import { useConfirmar } from '@/composables/useConfirmar'

const { notificarOk, notificarError, notificarInfo, validacionFallida } = useNotificar()
const { confirmar, pedirTexto } = useConfirmar()

const router = useRouter()
const auth = useAuthStore()
const notis = useNotificacionesStore()

const drawer = ref(false)

// Menú agrupado; cada ítem solo aparece si el rol activo está en `roles`.
const GRUPOS = [
  {
    titulo: 'Operación',
    items: [
      { name: 'panel', label: 'Inicio', icon: 'home', roles: ['Administrador', 'Cliente'] },
      { name: 'dashboard', label: 'Dashboard', icon: 'space_dashboard', roles: ['Administrador'] },
      { name: 'recepcion', label: 'Recepción', icon: 'inbox', roles: ['Administrador'] },
      { name: 'muestras-admin', label: 'Muestras (gestión)', icon: 'biotech', roles: ['Administrador'] },
      { name: 'cola', label: 'Cola del día', icon: 'format_list_numbered', roles: ['Administrador'] },
      { name: 'solicitudes', label: 'Solicitudes', icon: 'description', roles: ['Administrador', 'Cliente'] },
      { name: 'cotizaciones', label: 'Cotizaciones', icon: 'request_quote', roles: ['Administrador', 'Cliente'] },
      { name: 'pagos', label: 'Mis pagos', icon: 'payments', roles: ['Cliente'] },
      { name: 'muestras', label: 'Mis muestras', icon: 'biotech', roles: ['Cliente'] },
    ],
  },
  {
    titulo: 'Gestión',
    items: [
      { name: 'usuarios', label: 'Usuarios', icon: 'group', roles: ['Administrador'] },
      { name: 'verificaciones', label: 'Verificación SENA', icon: 'verified', roles: ['Administrador'] },
      { name: 'catalogo-admin', label: 'Catálogo y precios', icon: 'sell', roles: ['Administrador'] },
      { name: 'plantillas', label: 'Plantillas de correo', icon: 'mail', roles: ['Administrador'] },
    ],
  },
  {
    titulo: 'Control',
    items: [
      { name: 'reportes', label: 'Reportes', icon: 'bar_chart', roles: ['Administrador'] },
      { name: 'mi-cuenta', label: 'Mi cuenta', icon: 'manage_accounts', roles: ['Administrador', 'Cliente'] },
    ],
  },
]

const grupos = computed(() =>
  GRUPOS.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(auth.rol)) })).filter((g) => g.items.length)
)

const iniciales = computed(() =>
  (auth.nombres || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
)

// Roles disponibles para el multirrol.
const rolesDisponibles = computed(() => auth.user?.roles || [])
const rolActivoId = ref(auth.user?.rol?._id || '')

async function cambiarRol(rolId) {
  try {
    await auth.cambiarRol(rolId)
    notificarOk('Rol cambiado')
    router.push({ name: auth.rol === 'Administrador' ? 'dashboard' : 'panel' })
  } catch (e) {
    notificarError(e, 'No se pudo cambiar el rol')
  }
}

async function cargarNotificaciones() {
  try {
    await notis.cargar()
  } catch {
    /* la campana no debe interrumpir al usuario */
  }
}

async function salir() {
  const ok = await confirmar({
    titulo: '¿Cerrar sesión?',
    texto: 'Tendrás que ingresar de nuevo para continuar.',
    confirmar: 'Cerrar sesión',
  })
  if (!ok) return
  auth.logout()
  router.push({ name: 'login' })
}

onMounted(cargarNotificaciones)
</script>

<style scoped>
/* ---------- Topbar glass ---------- */
.topbar {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 20px -10px rgba(11, 34, 56, 0.05);
}
.topbar-toolbar { min-height: 64px; padding: 0 24px; }

.topbar-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: #064e3b;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.2px;
}
.pulse-wrap {
  position: relative;
  display: inline-flex;
  width: 8px;
  height: 8px;
}
.pulse-ping,
.pulse-dot {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: #39a900;
}
.pulse-ping { animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite; }
@keyframes ping {
  75%, 100% { transform: scale(2.2); opacity: 0; }
}

.topbar-sep { color: #cbd5e1; }
.topbar-tagline {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: #94a3b8;
}

.campana {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid rgba(226, 232, 240, 0.8);
  color: #475569;
}
.campana-punto {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f43f5e;
  border: 2px solid #fff;
}

.topbar-divider {
  width: 1px;
  height: 24px;
  background: #e2e8f0;
  margin: 0 14px;
}

.topbar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 8px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid #fff;
}
.topbar-avatar {
  width: 32px;
  height: 32px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0b2238, #102a45);
  color: #fff;
  font-weight: 800;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 2px rgba(57, 169, 0, 0.4);
  flex-shrink: 0;
}
.topbar-user__txt { line-height: 1.15; }
.topbar-user__nombre { font-size: 12px; font-weight: 800; color: #0b2238; max-width: 150px; }
.topbar-user__rol { font-size: 10px; color: #64748b; font-weight: 500; }

/* ---------- Drawer navy (el fondo vive en styles/main.css porque Quasar
   aplica la clase al `.q-drawer__content`, fuera del scope de Vue) ---------- */
.drawer-contenido { padding: 24px 16px 20px; gap: 16px; }
.marca { gap: 14px; padding: 0 8px; }
.marca-logo {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: linear-gradient(135deg, #39a900, #226d00);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px -8px rgba(57, 169, 0, 0.6);
  flex-shrink: 0;
}
.marca-texto { line-height: 1.15; min-width: 0; }
.marca-sena { font-weight: 900; font-size: 18px; letter-spacing: -0.02em; color: #fff; }
.marca-pill {
  margin-left: 6px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(57, 169, 0, 0.2);
  color: #6fdf43;
  border: 1px solid rgba(57, 169, 0, 0.3);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
}
.marca-sub { font-weight: 500; font-size: 11px; color: #94a3b8; }

.grupo-titulo {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #9db2c0;
  padding: 16px 12px 6px;
}
.nav-item {
  position: relative;
  min-height: 42px;
  border-radius: 12px;
  margin-bottom: 4px;
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.15s ease, color 0.15s ease;
}
.nav-item:hover { background: rgba(255, 255, 255, 0.06); color: #fff; }
.nav-icono { min-width: 36px; padding-right: 0; color: inherit; }
.nav-activo {
  background: linear-gradient(90deg, #39a900, #226d00);
  color: #fff !important;
  font-weight: 600;
  box-shadow: 0 10px 24px -10px rgba(57, 169, 0, 0.8);
}
.nav-activo::before {
  content: '';
  position: absolute;
  left: -16px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 24px;
  border-radius: 0 999px 999px 0;
  background: #6fdf43;
  box-shadow: 0 0 12px #6fdf43;
}

.calidad-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
}
.calidad-icono {
  width: 32px;
  height: 32px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(57, 169, 0, 0.2);
  color: #6fdf43;
  border: 1px solid rgba(57, 169, 0, 0.3);
  flex-shrink: 0;
}
.calidad-texto { min-width: 0; }
.calidad-titulo { font-size: 11px; font-weight: 600; color: #fff; }
.calidad-sub { font-family: 'JetBrains Mono', monospace; font-size: 9.5px; color: #94a3b8; }

.tarjeta-usuario {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  /* Un nombre largo no debe empujar la tarjeta ni el botón de salir. */
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}
.tarjeta-fila { min-width: 0; max-width: 100%; }
.tarjeta-datos { min-width: 0; flex: 1 1 auto; }
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: linear-gradient(135deg, #0b2238, #102a45);
  color: #fff;
  font-weight: 800;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 2px rgba(57, 169, 0, 0.4);
  flex-shrink: 0;
}
.usuario-nombre {
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.usuario-rol {
  color: #94a3b8;
  font-size: 11px;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.btn-salir { color: #cbd5e1; min-height: 34px; font-size: 12px; max-width: 100%; }

/* ---------- Contenido ---------- */
.pagina { background: transparent; }
.contenedor { padding: 28px 32px 40px; max-width: 1400px; margin: 0 auto; }
@media (max-width: 1023px) {
  .contenedor { padding: 18px 16px 32px; }
  .topbar-toolbar { padding: 0 12px; }
}
</style>