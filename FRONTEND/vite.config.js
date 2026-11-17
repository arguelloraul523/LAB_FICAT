import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
// El plugin de Quasar registra automáticamente los componentes (q-btn, q-input,
// q-table...) que usa cada plantilla. Sin él, Vue no resuelve los `q-*`.
// Los colores de marca se definen con variables --q-* en src/styles/main.css.
export default defineConfig({
  plugins: [
    vue({ template: { transformAssetUrls } }),
    quasar(),
  ],
  resolve: {
    alias: {
      // "@" apunta siempre a /src -> se acaban los "../../../components/..."
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // "src" se conserva como alias de compatibilidad.
      src: fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173, // el mismo puerto que el backend permite en CORS
    host: true,
  },
})
