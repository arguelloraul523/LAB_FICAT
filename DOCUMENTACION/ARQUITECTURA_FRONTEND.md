# ARQUITECTURA DEL FRONTEND — LABFICAT

> **Documento de referencia obligatorio** para cualquier persona que agregue, mueva o
> modifique código en `FRONTEND/`. La estructura de carpetas **no es decorativa**: cada
> carpeta tiene **una sola responsabilidad**. Si algo no encaja en ninguna, se detiene y
> se decide aquí (sección 5), no se improvisa.
>
> Última actualización: **2026-11-06**.

---

## 1. Árbol oficial

```
FRONTEND/
├── public/                 estáticos servidos tal cual (favicon)
├── src/
│   ├── assets/             recursos que procesa Vite (imágenes, logos)
│   ├── components/         componentes REUTILIZABLES (no conocen rutas ni backend)
│   │   ├── chatbot/
│   │   ├── Encabezados/    EncabezadoPagina.vue
│   │   └── Tables/         TablaDatos.vue
│   ├── composables/        lógica reutilizable de Composition API (useAlgo)
│   ├── layouts/            marco fijo de la aplicación (MainLayout.vue)
│   ├── plugins/            configuración única: axios.js y quasar.js
│   ├── router/             rutas + guard de sesión/rol (index.js)
│   ├── services/           consumo del backend: api.service.js (get/post/put/del)
│   ├── store/              estado GLOBAL con Pinia
│   ├── styles/             estilos globales (main.css) y del chatbot
│   ├── utils/              funciones PURAS (fechas, reglas de validación)
│   ├── views/              una pantalla por ruta (con subcarpetas por rol)
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── cliente/
│   │   ├── cola/
│   │   ├── publico/
│   │   ├── recepcion/
│   │   ├── Error404.vue
│   │   └── PanelPage.vue
│   ├── App.vue             raíz: <router-view> + ChatbotWidget
│   └── main.js             punto de entrada: Pinia + Router + Quasar + estilos
├── index.html
├── jsconfig.json           alias @ → ./src (autocompletado del editor)
├── package.json
└── vite.config.js          alias @ y src, plugin Vue, puerto 5173
```

---

## 2. Responsabilidad de cada carpeta

| Carpeta | Qué va | Qué **NO** va |
|---|---|---|
| `assets/` | Imágenes, logos, fuentes que Vite debe versionar | Nada que se descargue del backend |
| `components/` | Componentes **sin** lógica de negocio: reciben props y emiten eventos | Llamadas a `services`, `fetch` o `axios`; rutas; stores |
| `composables/` | Funciones `useAlgo()` que encapsulan lógica con Composition API (`$q`, `ref`, `watch`...) | Componentes (`.vue`); funciones puras |
| `layouts/` | El marco que envuelve a las vistas (barra, menú, campana) | Lógica de una pantalla concreta |
| `plugins/` | La configuración **única** de una librería (axios, Quasar) | Lógica de negocio; componentes |
| `router/` | Rutas, `meta` y el guard de sesión/rol | Componentes; llamadas al backend |
| `services/` | **Todas** las llamadas HTTP del proyecto | `ref`, `state`, `$q`, lógica de UI |
| `store/` | Estado global que **comparten varias pantallas** (sesión, catálogo, cola) | Estado que solo usa una pantalla (eso va en la vista con `ref`) |
| `styles/` | Estilos globales: variables, clases utilitarias, temas | Estilos de un solo componente (van en `<style scoped>`) |
| `utils/` | Funciones **puras**: reciben datos, devuelven datos, no tocan Vue ni el backend | Estado, `ref`, `$q`, `axios`, `localStorage` |
| `views/` | Una pantalla por ruta. Sabe qué servicio llamar y qué mostrar | Componentes reutilizables; configuración global |

### Reglas de oro

1. **Ninguna vista ni store llama a `axios` directamente.** Siempre `services/api.service.js`.
2. **`utils/` no importa nada del proyecto** (salvo otros `utils/`). Si necesita `$q` o `ref`, es un `composable`.
3. **`components/` no importa `services/`.** Si necesita datos, los recibe por props.
4. **El estado compartido va en `store/`; el de una pantalla, en la vista.**
5. **El rol, el estado y los precios los decide el backend.** El frontend solo los muestra.

---

## 3. El recorrido de un dato

```
Vista (views/)
  │  importa { get, post, put, del } de services/api.service.js
  ▼
services/api.service.js
  │  devuelve directo el `data` del backend (sin try/catch)
  ▼
plugins/axios.js
  │  agrega baseURL + token, normaliza el error a { status, mensaje, errores[] }
  ▼
Backend Express  →  MongoDB
  │
  ▼
Vista / store  →  notificarOk() o notificarError() con useNotificar()
```

Ejemplo real (catálogo):

```js
// views/admin/CatalogoPage.vue
import { get, post, put, del } from '@/services/api.service'
import { useNotificar } from '@/composables/useNotificar'

const { notificarOk, notificarError } = useNotificar()

async function cargar() {
  try {
    const data = await get('/catalogo/examenes', { params: { limite: 100 } })
    filas.value = data.data || []
  } catch (e) {
    notificarError(e, 'No se pudo cargar el catálogo')
  }
}
```

### Manejo de errores

- `plugins/axios.js` **siempre** rechaza un objeto `{ status, mensaje, errores[] }`.
- En `401` limpia la sesión y redirige a `/login`.
- Las vistas usan `notificarError(e, 'texto de respaldo')`; los avisos de éxito,
  `notificarOk('...')`.
- **Prohibido** `alert()`, `confirm()`, `prompt()` del navegador.

---

## 4. ¿Dónde pongo esto? (matriz de decisión)

| Si es... | Va en... |
|---|---|
| Una pantalla nueva (con ruta) | `views/<área>/XxxPage.vue` + una entrada en `router/index.js` |
| Un pedazo de UI que se repite en 2+ pantallas | `components/<Tipo>/Xxx.vue` |
| Lógica con `$q`, `ref` o `watch` que se repite en 2+ pantallas | `composables/useXxx.js` |
| Una llamada al backend | `services/api.service.js` (con `get/post/put/del`) |
| Un estado que leen 2+ pantallas | `store/xxx.js` |
| Un estado que solo usa una pantalla | `ref` dentro de esa vista |
| Formatear una fecha o un monto | `utils/formato.js` |
| Una regla de validación de formulario | `utils/reglas.js` |
| Un color, una clase global o un token | `styles/main.css` |
| La configuración de una librería nueva | `plugins/xxx.js` + registrarlo en `main.js` |

---

## 5. Recetario: agregar un módulo nuevo

Sigue el orden. Cada paso se puede probar antes de pasar al siguiente.

### Paso 1 — Servicio (si el módulo consume el backend)

No hace falta crear un archivo nuevo: se usan las 4 funciones existentes.

```js
import { get, post, put, del } from '@/services/api.service'
// GET /api/informes?pagina=1
const data = await get('/informes', { params: { pagina: 1 } })
```

### Paso 2 — Store (solo si el estado se comparte)

`src/store/informes.js`:

```js
import { defineStore } from 'pinia'
import { get } from '@/services/api.service'

export const useInformesStore = defineStore('informes', {
  state: () => ({ lista: [], cargando: false }),
  actions: {
    async cargar() {
      this.cargando = true
      try {
        const data = await get('/informes')
        this.lista = data.data || []
      } finally {
        this.cargando = false
      }
    },
  },
})
```

### Paso 3 — Vista

`src/views/admin/InformesPage.vue`:

```vue
<script setup>
import { onMounted, ref } from 'vue'
import EncabezadoPagina from '@/components/Encabezados/EncabezadoPagina.vue'
import TablaDatos from '@/components/Tables/TablaDatos.vue'
import { get } from '@/services/api.service'
import { useNotificar } from '@/composables/useNotificar'

const { notificarError } = useNotificar()
const filas = ref([])
const cargando = ref(false)
const columnas = [
  { name: 'codigo', label: 'Código', field: 'codigo', align: 'left', sortable: true },
]

async function cargar() {
  cargando.value = true
  try {
    const data = await get('/informes')
    filas.value = data.data || []
  } catch (e) {
    notificarError(e, 'No se pudieron cargar los informes')
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <div>
    <EncabezadoPagina titulo="Informes" icono="description" />
    <TablaDatos :filas="filas" :columnas="columnas" :cargando="cargando" />
  </div>
</template>
```

### Paso 4 — Ruta

En `src/router/index.js`, dentro de las hijas de `/app`:

```js
{
  path: 'informes',
  name: 'informes',
  component: () => import('@/views/admin/InformesPage.vue'),
  meta: { roles: ['Administrador'], titulo: 'Informes' },
},
```

### Paso 5 — Menú

En `src/layouts/MainLayout.vue`, en el grupo que corresponda:

```js
{ name: 'informes', label: 'Informes', icon: 'description', roles: ['Administrador'] },
```

### Paso 6 — Verificar

```bash
cd FRONTEND
npm run build        # debe terminar sin errores
npm run dev          # revisar la pantalla y la consola del navegador
```

---

## 6. Convenciones

| Elemento | Convención | Ejemplo |
|---|---|---|
| Componentes y vistas | `PascalCase.vue` | `EncabezadoPagina.vue`, `CatalogoPage.vue` |
| Stores | `camelCase.js` con `useXxxStore` | `store/dashboard.js` → `useDashboardStore` |
| Composables | `useAlgo.js` | `useNotificar.js`, `useConfirmar.js` |
| Servicios | `xxx.service.js` | `api.service.js` |
| Imports | alias `@` (nunca `../../../`) | `import { get } from '@/services/api.service'` |
| Rutas | `kebab-case` en `path`, `camelCase` en `name` | `muestras-admin` |
| Componentes de Quasar | `q-` en minúsculas | `<q-btn>`, `<q-table>` |
| Nombres de variables | `camelCase` | `filas`, `cargando`, `soloInvitados` |

---

## 7. Checklist antes de cerrar un cambio

- [ ] `npm run build` termina sin errores.
- [ ] `npm run dev` carga la pantalla afectada sin errores en consola.
- [ ] Ninguna vista importa `axios` ni `api.service` directamente (solo `get/post/put/del`).
- [ ] Ningún `utils/` importa `vue`, `quasar` o `services/`.
- [ ] Ningún `components/` llama al backend.
- [ ] Los mensajes usan `useNotificar` (no `alert`/`confirm`/`prompt`).
- [ ] Las rutas nuevas tienen `meta.titulo` y, si aplica, `meta.roles`.
- [ ] El ítem de menú existe si la pantalla es navegable.
- [ ] No se agregaron credenciales ni URLs al código (van en `.env`).

---

## 8. Adaptaciones deliberadas de LABFICAT

La estructura es la de la plantilla de referencia, con estas decisiones propias
(documentadas en el ADR de `MEMORIA_PROYECTO.md`):

| Punto | Plantilla de referencia | LABFICAT | Motivo |
|---|---|---|---|
| Sesión | `pinia-plugin-persistedstate` | `localStorage` en `store/auth.js` | Ya estaba implementado y funciona; el interceptor lee el token de ahí para evitar un import circular |
| Modo del router | `createWebHashHistory` (`/#/ruta`) | `createWebHistory` (`/ruta`) | El backend/Render ya sirve `index.html` en rutas internas |
| Estilos | SCSS + `variables.scss` | CSS + variables `--q-*` | Se conserva la paleta actual sin recompilar Quasar |
| Filtros de API | Solo en la URL | `get(url, config)` acepta `params` y `responseType` | Se necesitan descargas PDF/Excel y paginación |
| Notificaciones | `$q.notify` | `$q.notify` (igual) | Se eliminó SweetAlert2 para unificar |
