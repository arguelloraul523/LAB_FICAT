# BACKEND — Sistema de Gestión del Laboratorio (SENA)

Backend construido con **Node.js + Express + MongoDB Atlas (Mongoose)**, siguiendo una estructura **MVC**.

## Estructura de carpetas

```
BACKEND/
├── src/
│   ├── config/        # db.js (conexión a MongoDB Atlas) · multer.js (subida)
│   ├── constants/     # estados.js (máquinas de estado) · camposPermitidos.js (whitelist)
│   ├── models/        # Esquemas Mongoose (Model)
│   ├── controllers/   # Controladores (capa fina)
│   ├── services/      # Lógica de negocio
│   ├── routes/        # Rutas de la API
│   ├── middlewares/   # Auth, roles, transiciones, propiedad, rate limit, errores
│   ├── validators/    # Esquemas de validación de entrada
│   └── utils/         # Helpers (tokens, mailer, CRUD)
├── uploads/           # Archivos subidos (firmas, comprobantes, informes)
├── verificacion/      # Verificaciones manuales por función (sin BD)
├── pruebas/           # Prueba de integración del flujo completo (supertest)
├── index.js           # Punto de entrada único (Express + conexión + seed)
├── .env               # Variables de entorno (NO subir al repositorio)
├── .env.example       # Plantilla de variables de entorno
├── .gitignore
├── package.json
└── README.md
```

## Instalación

```bash
npm install
```

1. Copia `.env.example` a `.env` y completa la `MONGODB_URI` de tu cluster en Atlas.
2. Ejecuta en desarrollo:

```bash
npm run dev
```

## Nota sobre el modelo de datos

El diseño original está en `DOCUMENTACION/Scripts/SCRIPT_CORREGIDO.sql` (MySQL). En MongoDB, las tablas N:M se modelan con **arrays de referencias** o **documentos embebidos**, según se defina en cada módulo.

## Datos iniciales (seed)

```bash
npm run seed
```

Crea módulos, roles (Administrador, Recepcionista, Analista, Cliente), tipologías de cliente y un usuario administrador:

- **Correo:** `admin@laboratorio.com` (configurable en `.env` con `ADMIN_CORREO`)
- **Contraseña:** `Admin1234` (configurable con `ADMIN_CONTRASENA`)

## Recuperación de contraseña

- `POST /api/auth/olvide-contrasena` → genera un token temporal.
- `POST /api/auth/restablecer-contrasena` → restablece la contraseña con el token.

Si configuras las variables `MAIL_*` en `.env`, el token se envía por correo; si no, se devuelve en la respuesta (modo desarrollo).

## Pruebas y verificaciones

```bash
npm test            # prueba de integración del flujo completo (supertest + MongoDB en memoria)
npm run verificacion  # verificaciones manuales por función (sin base de datos)
```

- **`pruebas/flujo.integracion.test.js`**: recorre de registro a cierre en una sola
  prueba (registro, pre-solicitud, cotización, firma, cupón, pago, verificación,
  recepción, etapas, informe, encuesta, descarga y cierre; más una PQR).
- **`verificacion/`** (scripts ejecutables con `node verificacion/<archivo>.js`):
  - `recepcion-turnos-rechazos.js` — recepción, turnos, rechazo y rótulos (RF-17…RF-21).
  - `pagos.js` — registro/verificación de pagos (RF-08, RF-09, RF-12, RF-33).
  - `trazabilidad-codigo-ciego.js` — historial, ciego del Analista, asignación y reapertura (RF-22…RF-29).
  - `informe-encuestas-pqr.js` — informe, encuesta, cierre y PQR (RF-25, RF-26, RF-31).
  - `notificaciones-plantillas-cron-ia.js` — notificaciones/plantillas, cron y asistente IA (RF-14, RF-32, RF-11).
