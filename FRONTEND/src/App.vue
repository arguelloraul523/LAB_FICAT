<template>
  <router-view />
  <ChatbotWidget />
</template>

<script setup>
/**
 * App.vue — componente RAÍZ de la aplicación.
 *
 * Su único trabajo es ceder el espacio al router. Quien decide qué layout y qué
 * vista se pintan es /router/index.js.
 *
 * Excepción de LABFICAT: el widget del chatbot vive aquí porque debe estar
 * disponible en todas las pantallas (públicas y privadas).
 */
import ChatbotWidget from '@/components/chatbot/ChatbotWidget.vue'
</script>
