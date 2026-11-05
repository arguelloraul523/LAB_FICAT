import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Quasar, Notify, Dialog, Loading } from 'quasar'
import quasarLang from 'quasar/lang/es'

import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/dist/quasar.css'

import App from './App.vue'
import router from './router'
import './boot/axios'
import './css/app.css'
import './css/chatbot.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Quasar, {
  lang: quasarLang,
  plugins: { Notify, Dialog, Loading },
  config: {
    notify: { position: 'top' },
  },
})

app.mount('#app')
