// ============================================================
// Rutas del frontend. `meta.roles` restringe por rol (matriz §2);
// las rutas públicas llevan `meta.public: true`.
// Los imports usan el alias `src/` (definido en vite.config.js).
// ============================================================

const routes = [
  // ---- Públicas ----
  { path: '/', name: 'inicio', component: () => import('src/pages/publico/InicioPage.vue'), meta: { public: true } },
  { path: '/login', name: 'login', component: () => import('src/pages/auth/AuthPage.vue'), meta: { public: true } },
  { path: '/registro', name: 'registro', component: () => import('src/pages/auth/AuthPage.vue'), meta: { public: true } },
  { path: '/recuperar', name: 'recuperar', component: () => import('src/pages/auth/RecuperarPage.vue'), meta: { public: true } },

  // ---- Protegidas (dentro del MainLayout) ----
  {
    path: '/app',
    component: () => import('src/layouts/MainLayout.vue'),
    meta: { requiereAuth: true },
    children: [
      { path: '', name: 'panel', component: () => import('src/pages/PanelPage.vue') },
      { path: 'solicitudes', name: 'solicitudes', component: () => import('src/pages/cliente/SolicitudesPage.vue'), meta: { roles: ['Administrador', 'Recepcionista', 'Cliente'] } },
      { path: 'cotizaciones', name: 'cotizaciones', component: () => import('src/pages/cliente/CotizacionesPage.vue'), meta: { roles: ['Administrador', 'Recepcionista', 'Cliente'] } },
      { path: 'pagos', name: 'pagos', component: () => import('src/pages/cliente/MisPagosPage.vue'), meta: { roles: ['Cliente'] } },
      { path: 'muestras', name: 'muestras', component: () => import('src/pages/cliente/MisMuestrasPage.vue'), meta: { roles: ['Cliente'] } },
      { path: 'recepcion', name: 'recepcion', component: () => import('src/pages/recepcion/RecepcionPage.vue'), meta: { roles: ['Administrador', 'Recepcionista'] } },
      { path: 'cola', name: 'cola', component: () => import('src/pages/cola/ColaPage.vue'), meta: { roles: ['Administrador', 'Recepcionista', 'Analista'] } },
      { path: 'dashboard', name: 'dashboard', component: () => import('src/pages/admin/DashboardPage.vue'), meta: { roles: ['Administrador', 'Recepcionista'] } },
      { path: 'usuarios', name: 'usuarios', component: () => import('src/pages/admin/UsuariosPage.vue'), meta: { roles: ['Administrador'] } },
      { path: 'verificaciones', name: 'verificaciones', component: () => import('src/pages/admin/VerificacionesPage.vue'), meta: { roles: ['Administrador'] } },
      { path: 'catalogo', name: 'catalogo-admin', component: () => import('src/pages/admin/CatalogoPage.vue'), meta: { roles: ['Administrador'] } },
      { path: 'reportes', name: 'reportes', component: () => import('src/pages/admin/ReportesPage.vue'), meta: { roles: ['Administrador'] } },
    ],
  },

  // ---- 404 ----
  { path: '/:catchAll(.*)*', component: () => import('src/pages/Error404.vue') },
]

export default routes
