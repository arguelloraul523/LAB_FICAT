import { defineStore } from 'pinia'
import { api } from 'src/boot/axios'

// ============================================================
// Estado de autenticación y del usuario activo (multirrol).
// El token y el usuario se persisten en localStorage.
// ============================================================

function leerUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: leerUser(),
    cargando: false,
  }),

  getters: {
    isAuthenticated: (s) => !!s.token,
    rol: (s) => s.user?.rol?.nombre || '',
    nombres: (s) => `${s.user?.nombres || ''} ${s.user?.apellidos || ''}`.trim(),
    correo: (s) => s.user?.correo || '',
    // ¿El usuario es SENA (prioridad A1 / exonerado)?
    esSena: (s) => s.user?.tipoUsuario === 'SENA',
    // ¿Tiene uno de los roles indicados?
    tieneRol: (s) => (roles) => roles.includes(s.user?.rol?.nombre),
  },

  actions: {
    _guardar(token, user) {
      this.token = token
      this.user = user
      if (token) localStorage.setItem('token', token)
      else localStorage.removeItem('token')
      if (user) localStorage.setItem('user', JSON.stringify(user))
      else localStorage.removeItem('user')
    },

    async login(correo, contrasena) {
      this.cargando = true
      try {
        const { data } = await api.post('/auth/login', { correo, contrasena })
        this._guardar(data.token, null)
        await this.cargarPerfil()
        return data
      } finally {
        this.cargando = false
      }
    },

    async registrar(payload) {
      this.cargando = true
      try {
        const { data } = await api.post('/auth/registro', payload)
        this._guardar(data.token, null)
        await this.cargarPerfil()
        return data
      } finally {
        this.cargando = false
      }
    },

    // Trae el perfil poblado (incluye rol.nombre) tras login/registro.
    async cargarPerfil() {
      const { data } = await api.get('/auth/perfil')
      this.user = data.data
      localStorage.setItem('user', JSON.stringify(data.data))
      return data.data
    },

    async cambiarRol(rolId) {
      const { data } = await api.post('/auth/cambiar-rol', { rol: rolId })
      this.user = data.data
      localStorage.setItem('user', JSON.stringify(data.data))
      return data.data
    },

    async cambiarContrasena(payload) {
      return api.put('/auth/cambiar-contrasena', payload)
    },

    logout() {
      this._guardar('', null)
    },
  },
})
