import axios from 'axios'

// ============================================================
// Instancia de Axios con:
//  - baseURL desde VITE_API_URL (o localhost por defecto),
//  - interceptor que adjunta el token JWT,
//  - interceptor que cierra sesión y redirige en 401.
// ============================================================

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 20000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status
    // Sesión expirada / token inválido: limpiar y volver al login.
    if (status === 401) {
      const path = window.location.pathname
      if (!path.includes('/login')) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export { api }
export default api
