<template>
  <router-view />
  <ChatbotWidget v-if="mostrarChatbot" />
</template>

<script setup>
/**
 * App.vue — componente RAÍZ de la aplicación.
 *
 * Su único trabajo es ceder el espacio al router. Quien decide qué layout y qué
 * vista se pintan es /router/index.js.
 *
 * El widget del chatbot se muestra SOLO en:
 *   a) la página de inicio (pública), y
 *   b) el área de usuario (/app/*) una vez autenticado.
 * Queda fuera de Servicios, login, registro, recuperar y 404.
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import ChatbotWidget from '@/components/chatbot/ChatbotWidget.vue'

const route = useRoute()
const auth = useAuthStore()

const mostrarChatbot = computed(() => {
  if (route.name === 'inicio') return true
  const requiereAuth = route.matched.some((r) => r.meta?.requiereAuth)
  return requiereAuth && auth.isAuthenticated
})
</script>
