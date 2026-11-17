# FRONTEND — LABFICAT (Vue 3 + Quasar + Vite + Pinia)

Frontend del **Laboratorio de Caracterización Fisicoquímica de Alimentos (LABFICAT)**.

> La arquitectura obligatoria del proyecto está documentada en
> [`../DOCUMENTACION/ARQUITECTURA_FRONTEND.md`](../DOCUMENTACION/ARQUITECTURA_FRONTEND.md).
> **Léela antes de agregar una carpeta, una vista o un servicio.**

## Requisitos

- Node.js >= 18

## Instalación

```bash
cd FRONTEND
npm install
```

Copia `.env.example` a `.env` y ajusta:

```
VITE_API_URL=http://localhost:3000/api
VITE_APP_TITULO=LABFICAT
```

## Ejecutar en desarrollo

```bash
npm run dev
```

Abre `http://localhost:5173`.

## Build para producción

```bash
npm run build
```

El resultado queda en `dist/` (listo para servir como SPA en Render).

## Estructura

```
src/
├── assets/             recursos procesados por Vite
├── components/         reutilizables sin lógica de negocio
│   ├── chatbot/
│   ├── Encabezados/    EncabezadoPagina.vue
│   └── Tables/         TablaDatos.vue
├── composables/        useNotificar.js, useConfirmar.js
├── layouts/            MainLayout.vue (barra + menú + campana)
├── plugins/            axios.js (token/errores/401) y quasar.js
├── router/             rutas + guard por sesión y rol
├── services/           api.service.js (get/post/put/del)
├── store/              Pinia (auth, catálogo, dashboard, pagos...)
├── styles/             main.css + chatbot.css
├── utils/              funciones puras (formato, reglas)
├── views/              una pantalla por ruta
│   ├── publico/        landing
│   ├── auth/           login, registro, recuperar
│   ├── cliente/        solicitudes, cotizaciones, pagos, muestras
│   ├── recepcion/      buscar y recibir muestras
│   ├── cola/           cola del día (A1 → A2)
│   └── admin/          dashboard, usuarios, verificación, catálogo, reportes
├── App.vue             <router-view> + ChatbotWidget
└── main.js             Pinia + Router + Quasar + estilos
```

## Reglas de oro

1. Ninguna vista ni store llama a `axios`: usan `get/post/put/del` de `services/`.
2. Los mensajes usan `useNotificar` (nunca `alert`/`confirm`/`prompt`).
3. Los componentes reutilizables reciben todo por props/slots.
4. Los filtros simples van en la URL; `params`/`responseType` en el `config` del servicio.
5. El rol, el estado y los precios los decide el backend.

## Paleta (colores SENA)

Definida en `src/styles/main.css` (variables CSS `--q-*`):

| Uso | Hex |
|---|---|
| Verde SENA (primario) | `#39A900` |
| Verde oscuro (secundario) | `#2D8700` |
| Ámbar (acento / A1) | `#F5A623` |
| Fondo pastel | `#F5F7FA` |
| Gris suave | `#EFF3F6` |
| Texto | `#1F2937` |

## Roles

- **Cliente**: solicitudes, cotizaciones (firma), mis pagos, mis muestras.
- **Recepción**: buscar por código PRE-, recibir muestras, cola.
- **Analista**: cola del día en código ciego (sin datos del cliente).
- **Administrador**: dashboard, usuarios, verificación SENA, catálogo, reportes.
