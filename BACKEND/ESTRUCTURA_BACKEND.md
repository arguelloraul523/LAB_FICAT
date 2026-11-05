# Estructura del Backend — LABFICAT

> Guía de referencia de cada carpeta y archivo de `BACKEND/`.
> Stack: Node.js + Express + MongoDB Atlas (Mongoose), arquitectura **MVC**, **ES Modules**.
> Punto de entrada único: **`BACKEND/index.js`**.

---

## Raíz (`BACKEND/`)

| Archivo / carpeta | Qué hace |
|---|---|
| `index.js` | Punto de entrada único. Carga `.env`, configura Express, conecta a MongoDB (vía `src/config/db.js`), arranca el servidor y, con el flag `--seed`, ejecuta la **siembra** (datos iniciales: roles, tipologías, catálogo, plantillas, parámetros, admin). |
| `package.json` | Dependencias y scripts (`start`, `dev`, `seed`, `test`, `verificacion`). `"type": "module"`. |
| `.env` / `.env.example` | Variables de entorno (credenciales y configuración). **Nunca se suben ni se leen del código.** |
| `.gitignore` | Archivos y carpetas ignorados por git (node_modules, uploads, .env, logs…). |
| `API_TEST.http` | Colección de peticiones HTTP de prueba (extensión "REST Client" de VS Code o Postman). |
| `README.md` | Resumen del backend. |
| `iniciar-backend.bat` | Script para arrancar el backend en Windows. |
| `backend.log` | Log de ejecución (histórico). |

---

## `src/` — código fuente (MVC)

### `src/config/`
Configuración de infraestructura.

| Archivo | Qué hace |
|---|---|
| `db.js` | Conexión/desconexión a **MongoDB Atlas** (`conectarDB` / `desconectarDB`). Imprime el host real al conectar y falla en 5 s si Atlas no responde. |
| `multer.js` | Configuración de subida de archivos (JPG/PNG/PDF, máx. 5 MB, en **memoria** para GridFS) y `crearUpload(subcarpeta)` para carpetas protegidas. |

### `src/constants/`
Valores constantes y reglas de dominio compartidas.

| Archivo | Qué hace |
|---|---|
| `estados.js` | **Máquinas de estado** (Solicitud, Cotización, Pago, Muestra/etapa, PQR) y `transicionValida()` (transición inválida → HTTP 409). |
| `camposPermitidos.js` | **Whitelist del body**: campos que NUNCA se aceptan del cliente (`rol`, `estado`, códigos, valores de servidor…). Expone `sanitizarBody()` y `permitirCampos()`. Regla inviolable #12. |
| `sena.js` | Regla del dominio SENA: `DOMINIO_SENA`, `RE_CORREO_SENA` (`@sena.edu.co` exacto) y `esCorreoSena()`. |

### `src/models/`
Esquemas Mongoose (capa Model). Uno por colección.

| Modelo | Representa |
|---|---|
| `Usuario.js` | Usuarios (SENA/externo, multirrol, datos de cliente). |
| `Rol.js` / `Modulo.js` | Roles y módulos del sistema. |
| `TipologiaCliente.js` | Tipologías de cliente (RF-04). |
| `VerificacionSena.js` | Solicitudes de verificación SENA (`@sena.edu.co`). |
| `CategoriaAnalisis.js` / `TipoMuestra.js` / `Examen.js` | **Catálogo** de análisis (RF-05). |
| `Solicitud.js` | Pre-solicitud / solicitud (con `autorizacion` embebida y `examenes[]`). |
| `Cotizacion.js` | Cotización (con `detalles[]` embebidos). |
| `CuentaRecaudo.js` / `CuponPago.js` / `Pago.js` | Cuentas oficiales, cupones y pagos (RF-07/08/09). |
| `Muestra.js` / `HistorialMuestra.js` | Muestras (código A1/A2, turno, etapa) y su historial inmutable (RF-24). |
| `MotivoRechazo.js` / `Rechazo.js` | Catálogo de motivos y rechazos (RF-20). |
| `Informe.js` | Informes de resultados (RF-25). |
| `PreguntaEncuesta.js` / `Encuesta.js` | Encuesta de satisfacción (RF-26). |
| `PlantillaMensaje.js` / `Notificacion.js` | Plantillas de correo y notificaciones (RF-14). |
| `OpcionAsistenteIA.js` / `MensajeAsistente.js` | Asistente IA (RF-11). |
| `ParametroSistema.js` | Parámetros clave-valor configurables (RF-31/32). |
| `Inconformidad.js` | PQR / inconformidades (RF-31). |
| `Contador.js` | Secuencias atómicas para códigos consecutivos (RF-18). |
| `AuditoriaConfiguracion.js` | Auditoría de cambios de configuración (RF-27/31). |

### `src/controllers/`
Controladores (capa Controller). Delgados: delegan la lógica en `services/`.

| Controlador | Módulo |
|---|---|
| `auth.controller.js` | Registro, login, perfil, recuperación/restablecimiento de contraseña, cambiar rol activo, tipología. |
| `usuario.controller.js` | Usuarios + verificación SENA (aprobar/rechazar). |
| `rol.controller.js` | Roles y módulos. |
| `catalogo.controller.js` | Categorías, tipos de muestra y exámenes (catálogo público + CRUD admin). |
| `solicitud.controller.js` | Solicitudes + **cotizaciones** (crear, aceptar con firma, descargar PDF). |
| `pago.controller.js` | Cuentas, cupones y pagos (registrar + verificar). |
| `muestra.controller.js` | Muestras, turnos, etapas, historial. |
| `rechazo.controller.js` | Motivos de rechazo y rechazos. |
| `informe.controller.js` | Informes (subir PDF + aprobar + descargar). |
| `encuesta.controller.js` | Preguntas y encuestas. |
| `notificacion.controller.js` | Notificaciones. |
| `configuracion.controller.js` | Plantillas, opciones IA, parámetros y tipologías. |
| `inconformidad.controller.js` | PQR / inconformidades. |
| `asistente.controller.js` | Chat del asistente IA. |
| `cron.controller.js` | Disparo externo del cron de alertas (con secreto). |
| `reporte.controller.js` | Dashboard y reportes exportables. |

### `src/routes/`
Definición de endpoints (capa Routes). Agrupados por recurso; el enrutador raíz es `index.js`.

| Archivo | Prefijo de ruta |
|---|---|
| `index.js` | Monta todas las rutas bajo `/api`. |
| `auth.routes.js` | `/api/auth/*` |
| `usuario.routes.js` | `/api/usuarios/*` |
| `rol.routes.js` / `modulo.routes.js` | `/api/roles/*` y `/api/modulos/*` |
| `catalogo.routes.js` | `/api/catalogo/*` |
| `solicitud.routes.js` | `/api/solicitudes/*` |
| `cotizacion.routes.js` | `/api/cotizaciones/*` |
| `pago.routes.js` | `/api/pagos/*` |
| `muestra.routes.js` | `/api/muestras/*` |
| `rechazo.routes.js` | `/api/rechazos/*` |
| `informe.routes.js` | `/api/informes/*` |
| `encuesta.routes.js` | `/api/encuestas/*` |
| `notificacion.routes.js` | `/api/notificaciones/*` |
| `configuracion.routes.js` | `/api/configuracion/*` |
| `inconformidad.routes.js` | `/api/inconformidades/*` |
| `asistente.routes.js` | `/api/asistente/*` |
| `cron.routes.js` | `/api/cron/*` |
| `reporte.routes.js` | `/api/reportes/*` |

### `src/middlewares/`
Funciones intermedias de las rutas.

| Archivo | Qué hace |
|---|---|
| `auth.middleware.js` | `proteger` (valida JWT y carga usuario) y `autorizar(...roles)` (restringe por rol). |
| `propietario.middleware.js` | Propiedad de registros: el Cliente solo accede a lo suyo (`filtrarPropios`, `exigirPropietario`, `esCliente`). |
| `transicion.middleware.js` | Valida transiciones de estado; inválida → **409**. |
| `rateLimit.middleware.js` | Límite de peticiones en `/auth` (anti fuerza bruta). |
| `cronSecret.middleware.js` | Protege el cron externo con `x-cron-secret`. |
| `error.middleware.js` | `notFound` (404) y `manejadorErrores` (errores de validación, duplicados, ids inválidos). |

### `src/services/`
**Lógica de negocio** (regla del proyecto: controladores delgados, servicios gruesos).

| Archivo | Responsabilidad |
|---|---|
| `codigos.service.js` | Códigos consecutivos y atómicos (PRE-, COT-, CUP-, A1/A2-). |
| `sena.service.js` | Exoneración SENA (`esSenaExonerado`). |
| `sugerencia.service.js` | Motor de sugerencias de baterías de ensayos (RF-16). |
| `cotizacion.service.js` | Cálculo de cotización: precios vigentes + snapshot (RF-06). |
| `cupones.service.js` | Emisión de cupón de pago (RF-09). |
| `pagos.service.js` | Registro y verificación de pagos (RF-08/09). |
| `turnos.service.js` | Turno diario atómico y cola A1→A2 (RF-19). |
| `muestras.service.js` | Recepción de muestras y cambio de etapa (RF-17/23). |
| `rechazos.service.js` | Rechazo de muestras con motivo parametrizado (RF-20). |
| `blindaje.service.js` | Código ciego del Analista (DTO técnico, RF-22). |
| `rotulo.service.js` | Rótulo imprimible y hoja de trabajo anónima (RF-21/22). |
| `informes.service.js` | Informes (subir/validar) y descarga protegida (RF-25). |
| `encuestas.service.js` | Encuesta 1-5 con todas las preguntas obligatorias (RF-26). |
| `cierre.service.js` | Cierre automático de la solicitud (RF-15/26). |
| `inconformidades.service.js` | PQR con máquina de estados (RF-31). |
| `notificaciones.service.js` | Servicio único de notificación con plantillas (RF-14). |
| `plantillas.service.js` | Render de plantillas (`{{variable}}`). |
| `colaNotificaciones.service.js` | Cola asíncrona de correo con reintentos (RNF-09). |
| `eventos.service.js` | Bus de eventos (`pagoAprobado`, `pagoRechazado`, etc.). |
| `cron.service.js` | Cron de alertas de retraso (RF-32). |
| `asistente.service.js` | Asistente IA (RF-11). |
| `reportes.service.js` | Dashboard y reportes (RF-27/30). |
| `export.service.js` | Exportación CSV / Excel (`exceljs`) / PDF (`pdfkit`). |
| `pdf.service.js` | PDFs de cotización y acta de rechazo (formato LABFICAT). |
| `storage.service.js` | Almacenamiento de archivos en **GridFS** (persistente en Atlas). |

### `src/utils/`
Utilidades reutilizables.

| Archivo | Qué hace |
|---|---|
| `asyncHandler.js` | Envuelve controladores async para capturar errores. |
| `crudFactory.js` | CRUD genérico con whitelist y `req.alcance` (propiedad). |
| `crudConAuditoria.js` | CRUD genérico + registro de cambios en `AuditoriaConfiguracion` (RF-31). |
| `tokens.js` | Generar/verificar JWT. |
| `paginar.js` | Paginación con tope y expresiones regulares escapadas. |
| `mailer.js` | Envío de correo (nodemailer, opcional vía SMTP). |

### `src/validators/`
Validación de entrada con `express-validator` (uno por recurso + `index.js` con `validarCampos`).

| Archivo | Valida |
|---|---|
| `auth.validators.js` | Registro, login, recuperación, cambio de contraseña/rol. |
| `usuario.validators.js` | Usuarios y verificación SENA. |
| `catalogo.validators.js` | Categorías, tipos de muestra y exámenes. |
| `solicitud.validators.js` | Pre-solicitud y sugerencias. |
| `cotizacion.validators.js` | Cotización y firma digital. |
| `pago.validators.js` | Pagos, cuentas y cupones. |
| `muestra.validators.js` | Muestras (recepción, etapa, asignación, reapertura). |
| `rechazo.validators.js` | Motivos y rechazos. |
| `informe.validators.js` | Informes. |
| `encuesta.validators.js` | Preguntas y encuestas. |
| `notificacion.validators.js` | Notificaciones. |
| `configuracion.validators.js` | Plantillas, parámetros, opciones IA, tipologías. |
| `inconformidad.validators.js` | PQR. |
| `asistente.validators.js` | Chat del asistente. |
| `reporte.validators.js` | Fechas de reportes. |
| `rol.validators.js` | Roles y módulos. |
| `index.js` | `validarCampos`: devuelve los errores acumulados de express-validator. |

---

## `pruebas/`
- `flujo.integracion.test.js` — Prueba de integración del flujo completo (registro → cierre) con **supertest + mongodb-memory-server**. Se ejecuta con `npm test`.

## `verificacion/`
Scripts de verificación manual por función (`npm run verificacion`):
- `recepcion-turnos-rechazos.js`
- `pagos.js`
- `trazabilidad-codigo-ciego.js`
- `informe-encuestas-pqr.js`
- `notificaciones-plantillas-cron-ia.js`

## `uploads/`
Archivos generados/subidos. **Ojo:** en producción se usa **GridFS** (MongoDB Atlas), no el filesystem, porque el disco de Render es efímero. Carpetas protegidas (no se sirven por `/uploads`):
`cotizaciones`, `firmas`, `informes`, `comprobantes`, `verificacion-sena`, `evidencias`, `soportes-pqr`, `rechazos`.

---

## Flujo resumido (cómo se conecta todo)

```
HTTP → routes/* → middlewares (auth/roles/transición/propiedad)
      → validators/* (formato) → controllers/* (delgados)
      → services/* (lógica de negocio) → models/* (Mongoose) → MongoDB Atlas
```

- El **arranque** es `index.js`: `conectarDB()` → (opcional) `correrSeed()` → `app.listen()`.
- Los **archivos binarios** viven en GridFS vía `services/storage.service.js`.
- Los **códigos consecutivos** (PRE/COT/CUP/A1/A2) salen de `services/codigos.service.js` con `Contador`.
