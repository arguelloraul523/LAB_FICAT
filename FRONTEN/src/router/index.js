import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes'

// ============================================================
// Router con guard por rol.
// - Las rutas públicas son visibles para todos.
// - Las rutas con meta.requiereAuth exigen token.
// - Las rutas con meta.roles exigen que el rol activo esté incluido.
// ============================================================

function rolActivo() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')?.rol?.nombre || ''
  } catch {
    return ''
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  const esPublica = to.meta.public === true

  // Ya logueado y va a login/registro/recuperar → al panel.
  if (esPublica && token && ['login', 'registro', 'recuperar'].includes(to.name)) {
    return { name: 'panel' }
  }

  // Ruta protegida sin token → login (guardando a dónde quería ir).
  if (to.meta.requiereAuth && !token) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // Ruta con roles: verificar el rol activo.
  if (to.meta.roles && to.meta.roles.length) {
    if (!to.meta.roles.includes(rolActivo())) {
      return { name: 'panel' }
    }
  }

  return true
})

export default router
