/**
 * main.js — punto de entrada de la aplicación.
 *
 * Es el único archivo que "arma" el proyecto: crea la app, le instala los
 * plugins (Pinia, Router, Quasar) y la monta en el <div id="app"> del index.html.
 *
 * Regla práctica: si algo tiene que estar disponible en TODA la aplicación, se
 * registra aquí. Si no, no.
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import { router } from './router'
import { instalarQuasar } from './plugins/quasar'

// Los estilos propios van DESPUÉS de los de Quasar (que se importan dentro de
// plugins/quasar.js) para que las personalizaciones ganen.
import './styles/main.css'
import './styles/chatbot.css'

const app = createApp(App)

app.use(createPinia()) // estado global  -> /store
app.use(router) // navegación    -> /router
instalarQuasar(app) // interfaz      -> /plugins/quasar.js

app.mount('#app')
