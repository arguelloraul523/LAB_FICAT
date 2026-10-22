# FRONTEND — Sistema de Gestión del Laboratorio (SENA)

Frontend construido con **Quasar + Vue 3 + Vite + Pinia** (JavaScript).

## Requisitos

- Node.js >= 18

## Instalación

```bash
cd FRONTEN
npm install
```

1. Copia `.env.example` a `.env` y ajusta `VITE_API_URL` (URL del backend, por defecto `http://localhost:3000/api`).

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

## Paleta (colores SENA)

Definida en `src/css/app.css` (variables CSS `--q-*`):

| Uso | Hex |
|---|---|
| Verde SENA (primario) | `#39A900` |
| Verde oscuro (secundario) | `#2E7D32` |
| Ámbar (acento / A1) | `#F5A623` |
| Fondo pastel | `#F4F9F1` |
| Gris suave | `#EFF3F6` |
| Texto | `#1F2937` |

## Estructura

```
src/
├── boot/axios.js       # instancia axios + interceptor JWT + manejo 401
├── router/             # rutas + guard por rol (meta.roles)
├── stores/             # Pinia (auth, catalogo, dashboard)
├── layouts/MainLayout  # sidebar/topbar verde SENA + menú por rol
├── pages/
│   ├── publico/        # landing + catálogo
│   ├── auth/           # login, registro, recuperar
│   ├── cliente/        # solicitudes, cotizaciones+firma, pagos, muestras
│   ├── recepcion/      # buscar y recibir muestras
│   ├── cola/           # cola del día (A1 → A2)
│   └── admin/          # dashboard, usuarios, verificación SENA, catálogo, reportes
└── components/         # FirmaCanvas (firma digital)
```

## Roles

- **Cliente**: solicitudes, cotizaciones (firma), mis pagos, mis muestras.
- **Recepción**: buscar por código PRE-, recibir muestras, cola.
- **Analista**: cola del día en código ciego (sin datos del cliente).
- **Administrador**: dashboard, usuarios, verificación SENA, catálogo, reportes.
