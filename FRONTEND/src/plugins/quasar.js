/**
 * @fileoverview /plugins/quasar.js
 * Registro y configuración de Quasar como plugin de Vue.
 *
 * Aquí se declaran los "Quasar Plugins" (Notify, Dialog, Loading). Si un plugin
 * no se declara en esta lista, `$q.notify()` falla en tiempo de ejecución.
 */
import { Quasar, Notify, Dialog, Loading } from 'quasar'
import quasarLang from 'quasar/lang/es'

// Iconos y estilos base de Quasar.
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/dist/quasar.css'

/**
 * Instala Quasar en la instancia de Vue.
 * @param {import('vue').App} app - instancia creada con createApp()
 */
export function instalarQuasar(app) {
  app.use(Quasar, {
    lang: quasarLang,
    plugins: { Notify, Dialog, Loading },
    config: {
      // Configuración por defecto de cada notificación: se define una vez aquí
      // y no hay que repetirla en cada llamada a notify().
      notify: {
        position: 'top-right',
        timeout: 3000,
        actions: [{ icon: 'close', color: 'white', round: true }],
      },
    },
  })
}
