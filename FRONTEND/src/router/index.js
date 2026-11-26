/**
 * @fileoverview /router/index.js
 * TODA la configuración de rutas de la aplicación, en un solo archivo.
 *
 * Se lee de arriba a abajo:
 *   1. se arma el array "routes"
 *   2. se crea el router
 *   3. se protegen las rutas con un guard
 *   4. se actualiza el título de la pestaña
 *
 * Reglas del proyecto:
 *  - `meta.public: true`        → se puede ver sin sesión.
 *  - `meta.requiereAuth: true`  → exige token (se hereda a las hijas).
 *  - `meta.roles: [...]`        → solo esos roles (matriz de permisos).
 *  - `meta.titulo`              → título de la pestaña (lo usa afterEach).
 */
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  // ---- Públicas ----
  { path: '/', name: 'inicio', component: () => import('@/views/publico/InicioPage.vue'), meta: { public: true, titulo: 'Inicio' } },
  { path: '/servicios', name: 'servicios', component: () => import('@/views/publico/ServiciosPage.vue'), meta: { public: true, titulo: 'Servicios' } },
  { path: '/login', name: 'login', component: () => import('@/views/auth/AuthPage.vue'), meta: { public: true, titulo: 'Iniciar sesión' } },
  { path: '/registro', name: 'registro', component: () => import('@/views/auth/AuthPage.vue'), meta: { public: true, titulo: 'Registro' } },
  { path: '/recuperar', name: 'recuperar', component: () => import('@/views/auth/RecuperarPage.vue'), meta: { public: true, titulo: 'Recuperar contraseña' } },

  // ---- Protegidas (dentro del MainLayout) ----
  {
    path: '/app',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiereAuth: true },
    children: [
      { path: '', name: 'panel', component: () => import('@/views/PanelPage.vue'), meta: { titulo: 'Panel' } },
      { path: 'solicitudes', name: 'solicitudes', component: () => import('@/views/cliente/SolicitudesPage.vue'), meta: { roles: ['Administrador', 'Cliente'], titulo: 'Solicitudes' } },
      { path: 'cotizaciones', name: 'cotizaciones', component: () => import('@/views/cliente/CotizacionesPage.vue'), meta: { roles: ['Administrador', 'Cliente'], titulo: 'Cotizaciones' } },
      { path: 'pagos', name: 'pagos', component: () => import('@/views/cliente/MisPagosPage.vue'), meta: { roles: ['Cliente'], titulo: 'Mis pagos' } },
      { path: 'muestras', name: 'muestras', component: () => import('@/views/cliente/MisMuestrasPage.vue'), meta: { roles: ['Cliente'], titulo: 'Mis muestras' } },
      { path: 'recepcion', name: 'recepcion', component: () => import('@/views/recepcion/RecepcionPage.vue'), meta: { roles: ['Administrador'], titulo: 'Recepción' } },
      { path: 'cola', name: 'cola', component: () => import('@/views/cola/ColaPage.vue'), meta: { roles: ['Administrador'], titulo: 'Cola del día' } },
      { path: 'dashboard', name: 'dashboard', component: () => import('@/views/admin/DashboardPage.vue'), meta: { roles: ['Administrador'], titulo: 'Dashboard' } },
      { path: 'usuarios', name: 'usuarios', component: () => import('@/views/admin/UsuariosPage.vue'), meta: { roles: ['Administrador'], titulo: 'Usuarios' } },
      { path: 'verificaciones', name: 'verificaciones', component: () => import('@/views/admin/VerificacionesPage.vue'), meta: { roles: ['Administrador'], titulo: 'Verificaciones SENA' } },
      { path: 'catalogo', name: 'catalogo-admin', component: () => import('@/views/admin/CatalogoPage.vue'), meta: { roles: ['Administrador'], titulo: 'Catálogo' } },
      { path: 'muestras-admin', name: 'muestras-admin', component: () => import('@/views/admin/MuestrasPage.vue'), meta: { roles: ['Administrador'], titulo: 'Muestras (gestión)' } },
      { path: 'reportes', name: 'reportes', component: () => import('@/views/admin/ReportesPage.vue'), meta: { roles: ['Administrador'], titulo: 'Reportes' } },
      { path: 'plantillas', name: 'plantillas', component: () => import('@/views/admin/PlantillasPage.vue'), meta: { roles: ['Administrador'], titulo: 'Plantillas de correo' } },
      { path: 'mi-cuenta', name: 'mi-cuenta', component: () => import('@/views/MiCuentaPage.vue'), meta: { titulo: 'Mi cuenta' } },
    ],
  },

  // ---- 404 ----
  { path: '/:catchAll(.*)*', component: () => import('@/views/Error404.vue'), meta: { public: true, titulo: 'Página no encontrada' } },
]

export const router = createRouter({
  // createWebHistory: URLs limpias (sin #). Requiere configurar el servidor
  // para devolver index.html en las rutas internas (Render ya lo hace).
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

/** Rol activo guardado por /store/Auth. */
function rolActivo() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')?.rol?.nombre || ''
  } catch {
    return ''
  }
}

/**
 * PROTECCIÓN DE RUTAS (guard global).
 * @param {Object} to - ruta a la que se quiere entrar
 * @returns {boolean|Object} true para permitir, o una ruta para redirigir
 */
function protegerRutas(to) {
  let token = localStorage.getItem('token')

  // Sesión a medias: hay token pero no hay usuario/rol válido (p. ej. un token
  // viejo de otra prueba). Se descarta para no entrar con el menú vacío.
  if (token && !rolActivo()) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    token = ''
  }

  // Ruta protegida sin token → login (guardando a dónde quería ir).
  if (to.meta.requiereAuth && !token) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // /login, /registro y /recuperar SIEMPRE muestran su formulario, aunque haya
  // una sesión activa: permite cambiar de usuario sin cerrar sesión primero.

  // El Administrador (Jefe de Laboratorio) aterriza en su dashboard.
  if (to.name === 'panel' && rolActivo() === 'Administrador') {
    return { name: 'dashboard' }
  }

  // Ruta con roles: verificar el rol activo.
  if (to.meta.roles && to.meta.roles.length && !to.meta.roles.includes(rolActivo())) {
    return { name: 'panel' }
  }

  return true
}

router.beforeEach(protegerRutas)

// Título de la pestaña: "Dashboard | LABFICAT".
router.afterEach((to) => {
  const base = import.meta.env.VITE_APP_TITULO || 'LABFICAT'
  document.title = to.meta.titulo ? `${to.meta.titulo} | ${base}` : base
})
