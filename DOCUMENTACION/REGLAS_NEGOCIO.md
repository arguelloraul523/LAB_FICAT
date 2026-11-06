# REGLAS DE NEGOCIO — Sistema de Gestión del Laboratorio (SENA)

> Documento de contrato funcional. La fuente técnica viva es
> [`MEMORIA_PROYECTO.md`](./MEMORIA_PROYECTO.md); este documento detalla **quién puede hacer qué**
> (matriz de roles) y **qué transiciones de estado son válidas** (máquinas de estado).
>
> Última actualización: **2026-11-06**.

---

> **⚠️ Cambio 2026-11-06 — roles simplificados a 2.** Se eliminaron `Recepcionista` y `Analista`.
> Ahora solo existen **`Administrador`** (todo el personal del laboratorio) y **`Cliente`**
> (externo o SENA según `tipoUsuario`). Las tablas de abajo conservan el detalle histórico;
> donde decía "Recepcionista/Analista" hoy aplica a **`Administrador`**. El código ciego (RF-22)
> se conserva como **hoja de trabajo / rótulo** (solo código + exámenes), no como restricción de rol.

---

## 1. Roles del sistema

| Rol | Equivalente de negocio | Descripción |
|---|---|---|
| `Administrador` | **Jefe de Laboratorio** (RF-27/RF-31) | Control total: usuarios, catálogo, configuración, aprobar pagos y verificaciones SENA, des-anonimizar. |
| `Recepcionista` | Recepción de muestras | Gestiona solicitudes, cotizaciones, cupones, **verifica pagos** y recibe muestras. |
| `Analista` | Analista de laboratorio | Procesa muestras y ensayos, cambia etapas, genera informes. **Nunca ve datos del cliente (RF-22).** |
| `Cliente` | Usuario externo / SENA | Crea pre-solicitudes, paga, consulta **solo sus propios registros** y responde encuestas. |

### 1.1 Rol `Cajero` (RF-09) — decisión: **NO se crea**

La verificación de pagos (aprobar/rechazar comprobantes) la realizan **`Administrador` y
`Recepcionista`**. Se descartó crear un rol `Cajero` dedicado por decisión del 2026-10-08 (ver ADR en
la memoria del proyecto). Si en el futuro se exige segregación de funciones estricta, la única
restricción admisible sería limitar la verificación a `Administrador`.

### 1.2 Una persona, varios roles (multirrol)

En el laboratorio una misma persona puede cumplir **Recepcionista y Analista**. Para no violar RF-22:

- `Usuario.roles[]` = roles **asignados** a la persona.
- `Usuario.rol` = **rol activo** de la sesión. Todos los permisos se evalúan sobre el rol activo.
- `POST /api/auth/cambiar-rol { rol }` cambia el rol activo; **solo acepta un rol presente en
  `roles[]`** (si no, 403). El token JWT no cambia (solo lleva `id`).
- Con rol activo **Analista**, el backend solo expone código ciego (RF-22) aunque la persona también
  sea Recepcionista.
- La segregación es **por sesión**, no física: la persona puede alternar, pero cada acción queda
  atribuida al usuario; la ampliación de permisos es explícita y auditable.

### 1.3 Verificación SENA: solo `@sena.edu.co`

La solicitud de verificación (`POST /api/usuarios/verificaciones`) **solo admite un
`correoInstitucional` que termine en `@sena.edu.co`** (exacto: se rechazan subdominios como
`@virtual.sena.edu.co`). Decisión del 2026-10-09.

| Capa | Cómo lo aplica |
|---|---|
| Validador (`usuario.validators.js`) | `trim` + `toLowerCase` + `isEmail` + `matches(/@sena\.edu\.co$/)` → **400** |
| Modelo (`VerificacionSena`) | `match` en `correoInstitucional` (defensa ante escrituras directas) |
| Aprobar (`PUT /verificaciones/:id/aprobar`) | si el guardado no cumple → **400**; **rechazar siempre se permite** |
| Constante única | `src/constants/sena.js` → `DOMINIO_SENA`, `RE_CORREO_SENA`, `esCorreoSena()` |

- El ancla `$` impide trucos tipo `x@sena.edu.co.evil.com`; `isEmail().bail()` descarta
  `x@evil.com@sena.edu.co`.
- La validación corre **después** de multer (el correo llega como campo del multipart).
- No afecta al correo personal de la cuenta (`Usuario.correo`): ese sigue siendo libre.

---

## 2. Matriz rol → permisos (objetivo contractual)

Leyenda: **R** listar/obtener · **C** crear · **U** actualizar · **D** eliminar · **—** sin acceso.
"Propio" = solo los registros del usuario (propiedad, sección 4).

| Recurso / acción | Administrador | Recepcionista | Analista | Cliente |
|---|:--:|:--:|:--:|:--:|
| Auth: registro/login/recuperación | ✓ | ✓ | ✓ | ✓ |
| Auth: perfil, cambiar contraseña, cambiar rol activo | ✓ | ✓ | ✓ | ✓ |
| Usuarios: R / C / U / D | ✓ | — | — | — |
| Verificación SENA: R / C | ✓ | ✓ | ✓ | ✓ (propia) |
| Verificación SENA: aprobar / rechazar / D | ✓ | — | — | — |
| Roles y Módulos: R | ✓ | ✓ | ✓ | ✓ |
| Roles y Módulos: C / U / D | ✓ | — | — | — |
| Catálogo (categorías, tipos, exámenes): R | ✓ | ✓ | ✓ | ✓ |
| Catálogo: C / U / D | ✓ | — | — | — |
| Solicitudes: R / C | ✓ | ✓ | — | Propio |
| Solicitudes: U (estado) | ✓ | ✓ | — | — |
| Solicitudes: D | ✓ | — | — | — |
| Cotizaciones: R | ✓ | ✓ | — | Propio |
| Cotizaciones: C / U (estado) | ✓ | ✓ | — | — |
| Cotizaciones: D | ✓ | — | — | — |
| Pagos · cuentas: R | ✓ | ✓ | ✓ | ✓ |
| Pagos · cuentas: C / U / D | ✓ | — | — | — |
| Pagos · cupones: R | ✓ | ✓ | — | Propio |
| Pagos · cupones: C | ✓ | ✓ | — | — |
| Pagos · cupones: U / D | ✓ | — | — | — |
| Pagos: R | ✓ | ✓ | — | Propio |
| Pagos: C (reportar comprobante) | ✓ | ✓ | — | Propio |
| Pagos: verificar (aprobar/rechazar) | ✓ | ✓ | — | — |
| Pagos: bandeja de pendientes | ✓ | ✓ | — | — |
| Pagos: D | ✓ | — | — | — |
| Muestras / historial: R | ✓ | ✓ | ✓ (código ciego) | Propio |
| Muestras: C (recepción: código + turno + estado inicial) | ✓ | ✓ | — | — |
| Muestras: buscar (recepción) | ✓ | ✓ | — | — |
| Muestras: cola de atención | ✓ | ✓ | ✓ | — |
| Muestras: rótulo 58/80 mm | ✓ | ✓ | ✓ | — |
| Muestras: cambiar estado / etapa | ✓ | ✓ | ✓ | — |
| Muestras: asignar / reasignar analista (motivo) | ✓ | — | — | — |
| Muestras: reabrir Finalizada (motivo) | ✓ | — | — | — |
| Muestras: hoja de trabajo A4 (anónima) | ✓ | ✓ | ✓ | — |
| Muestras: des-anonimizar datos del cliente (contraseña + motivo) | ✓ | ✓ | — | — |
| Muestras: D | ✓ | — | — | — |
| Rechazos: R | ✓ | ✓ | ✓ | — |
| Rechazos: C (con motivo del catálogo) | ✓ | ✓ | — | — |
| Rechazos: U | ✓ | ✓ | — | — |
| Rechazos: decisión Reenviar/Recoger | ✓ | ✓ | — | Propio |
| Rechazos: D | ✓ | — | — | — |
| Rechazos · motivos (catálogo): R | ✓ | ✓ | ✓ | — |
| Rechazos · motivos (catálogo): C / U / D | ✓ | — | — | — |
| Informes: R | ✓ | ✓ | ✓ | Propio |
| Informes: C (subir PDF) / aprobar | ✓ | — | — | — |
| Informes: PDF (stream; exige encuesta completa) | ✓ | — | — | Propio |
| Informes: D | ✓ | — | — | — |
| Encuestas · preguntas: R | ✓ | ✓ | ✓ | ✓ |
| Encuestas · preguntas: C / U / D | ✓ | — | — | — |
| Encuestas: R | ✓ | ✓ | ✓ | Propio |
| Encuestas: responder (escala 1-5, todas obligatorias) | ✓ | — | — | Propio |
| Encuestas: D | ✓ | — | — | — |
| Notificaciones: R / U (leída) | ✓ | ✓ | ✓ | Propio |
| Notificaciones: C / D | ✓ | — | — | — |
| Notificaciones: envío único con plantilla (App + correo, asíncrono) | — (servidor) | — | — | — |
| Asistente IA: chat (catálogo + parámetros) | ✓ | ✓ | ✓ | ✓ |
| Configuración (plantillas, IA, parámetros, tipologías): R | ✓ | ✓ | ✓ | ✓ |
| Configuración: C / U / D | ✓ | — | — | — |
| Inconformidades (PQR): R / C | ✓ | ✓ | ✓ | Propio |
| Inconformidades: cambiar estado / resolver (con respuesta) | ✓ | — | — | — |
| Inconformidades: D | ✓ | — | — | — |
| Dashboard (RF-27) | ✓ | ✓ | — | — |
| Reportes por rango (RF-30) | ✓ | — | — | — |
| Auditoría de configuración (RF-31) | ✓ | — | — | — |

> **Analista y datos del cliente (RF-22/RNF-01):** aunque la tabla muestre ✓ de lectura en
> solicitudes/muestras, para el rol **Analista** el backend debe devolver la versión **con código
> ciego** (sin identidad del cliente). Es una regla transversal, no una fila.

---

## 3. Máquinas de estado

La fuente ejecutable es `BACKEND/src/constants/estados.js`. Una transición no listada **se rechaza
con HTTP 409** (`transicion.middleware.js`). Los estados terminales (sin salidas) quedan cerrados.

### 3.1 Solicitud (`Solicitud.estado`) — inicial `Pre-solicitud`

| Desde | Hacia (permitidos) | Actor |
|---|---|---|
| `Pre-solicitud` | `Cotizada`, `No aceptada`, `Cancelada` | Recepcionista/Admin |
| `Cotizada` | `Pendiente de pago`, `Pagada`, `Cancelada` | Sistema al aceptar la firma: emite cupón si valor > 0 → `Pendiente de pago`; **exonerada → `Pagada`**; Admin |
| `Pendiente de pago` | `Pagada`, `Cancelada` | Sistema (pago verificado); Admin |
| `Pagada` | `En proceso` | Recepcionista/Admin (recepción de muestra) |
| `En proceso` | `Finalizada` | Analista/Admin (informe aprobado) |
| `Finalizada` | — (terminal) | — |
| `No aceptada` | — (terminal) | — |
| `Cancelada` | — (terminal) | — |

```
Pre-solicitud ─▶ Cotizada ─┬─▶ Pendiente de pago ─▶ Pagada ─▶ En proceso ─▶ Finalizada
                           ├─▶ Pagada        (exonerada SENA: salta aquí, sin cupón)
                           └─▶ Cancelada
Pre-solicitud ─▶ No aceptada
```

> **Importante:** la arista `Cotizada → Pagada` **solo la usa el servidor** al aceptar una
> cotización exonerada. El camino normal de un externo es `Cotizada → Pendiente de pago → Pagada`;
> una solicitud `Pendiente de pago` **no puede recibir muestra** (409, RF-09).

### 3.2 Cotización (`Cotizacion.estado`) — inicial `Enviada`

| Desde | Hacia | Actor |
|---|---|---|
| `Enviada` | `Aceptada`, `No aceptada` | Cliente |
| `Aceptada` | — (terminal) | — |
| `No aceptada` | — (terminal) | — |

### 3.3 Pago (`Pago.estado`) — inicial `Pendiente de verificación`

| Desde | Hacia | Actor | Regla |
|---|---|---|---|
| `Pendiente de verificación` | `Pagado` | Admin/Recepcionista | deja `verificadoPor` y `fechaRevision`; **avanza la `Solicitud` a `Pagada`** y dispara `pagoAprobado` |
| `Pendiente de verificación` | `Rechazado` | Admin/Recepcionista | **exige `observacion`** (RF-09); dispara `pagoRechazado` con el motivo |
| `Rechazado` | `Pendiente de verificación` | Cliente (nuevo comprobante) | reintento permitido: en la API se materializa como un **nuevo `Pago`** para el mismo cupón |
| `Pagado` | — (terminal) | — | — |

Cada cambio queda en `Pago.historial[]` (estado, fecha, usuario y observación), escrito solo por el
servidor; el cliente lo ve en **`GET /api/pagos/mis-pagos`** y en `GET /api/pagos/:id`.

### 3.4 Muestra

**Estado (`Muestra.estado`)** — inicial `Aceptada` (o `En observación`) en recepción

| Desde | Hacia | Actor |
|---|---|---|
| `Recibida`* | `Aceptada`, `En observación`, `Rechazada` | Recepcionista/Admin |
| `Aceptada` | `En observación`, `Rechazada` | Recepcionista/Admin |
| `En observación` | `Aceptada`, `Rechazada` | Recepcionista/Admin |
| `Rechazada` | — (terminal) | — |

> \* `Recibida` queda solo como valor histórico de muestras anteriores a 2026-10-09.

**Etapa (`Muestra.etapaActual`)** — inicial `Recepción`

| Desde | Hacia | Actor |
|---|---|---|
| `Recepción` | `Análisis` | Recepcionista/Admin |
| `Análisis` | `Observaciones`, `Resultados` | Analista |
| `Observaciones` | `Análisis`, `Resultados` | Analista |
| `Resultados` | `Validación`, `Re-ensayo` | Analista |
| `Validación` | `Finalizada`, `Re-ensayo` | Admin (Jefe) |
| `Re-ensayo` | `Resultados` | Analista |
| `Finalizada` | — (terminal) | — |
| `Cancelada` | — (terminal; solo la escribe el servidor al rechazar) | — |

> `Re-ensayo` exige justificación (RF-23); `Rechazada` de muestra exige motivo parametrizado
> (RF-20) y **cancela el ciclo técnico** (la muestra queda en etapa `Cancelada`).

---

## 4. Propiedad de los registros (Cliente)

- En **listados** (`GET /`), el `Cliente` recibe únicamente sus propios registros
  (`filtrarPropios` + `req.alcance` en `crudFactory`).
- En **detalle/edición** (`GET/PUT/DELETE /:id`), si el recurso no es suyo → **403**
  (`exigirPropietario`).
- Cadena de propiedad: `Solicitud.usuario` → `Cotizacion`/`Encuesta`/`Muestra` vía `solicitud` →
  `CuponPago` vía `cotizacion` → `Pago` vía `cupon` → `Informe` vía `muestra`.
- Al **crear**, el `Cliente` no puede fijar `usuario`/`solicitud` ajenos (`fijarUsuarioPropio`).

---

## 5. Whitelist de campos (nunca desde `req.body`)

Regla inviolable #12: **el rol y el estado no se aceptan del cliente.** `crudFactory` descarta del
body (`src/constants/camposPermitidos.js`):

- Identidad/permisos: `_id`, `__v`, `createdAt`, `updatedAt`, `contrasenaHash`,
  `tokenRecuperacion`, `tokenExpiracion`, `rol`, `roles`, `tipoUsuario`, `activo`.
- Códigos/valores de servidor: `codigoPresolicitud`, `codigoMuestra`, `numeroCotizacion`,
  `codigoReferencia`, `prioridad`, `numeroTurno`, `recepcionista`, `analista`, `verificadoPor`,
  `exonerada`, `historial`, `fechaCarga`, `fechaRevision` (auditoría de pagos).
- Estados: `estado`, `etapaActual` → **solo** si un middleware de transición los validó.

El **registro público** (`POST /api/auth/registro`) fija en servidor `rol = Cliente` y
`tipoUsuario = 'EXTERNO'`; el paso a `SENA` requiere verificación/aprobación (cierra RF-02/RF-06).

---

## 6. Criterios de cierre (aceptación)

1. Una **transición inválida** responde **HTTP 409** con `{ ok: false, mensaje }`.
2. Un **Cliente no puede leer** (ni editar) registros de otro → **HTTP 403**.
3. **`rol` / `tipoUsuario` / `estado`** enviados en el body se **ignoran** (whitelist).
4. Un **externo no puede registrarse como `SENA` ni como `Administrador`.**
5. `cambiar-rol` con un rol no asignado responde **403**.
6. Crear una verificación SENA con un correo que no sea `@sena.edu.co` responde **400**; aprobar
   una solicitud con correo heredado no válido también responde **400** (rechazar sí procede).

---

## 7. Catálogo público, pre-solicitud y sugerencias (RF-05, RF-16)

### 7.1 Catálogo público (sin token)

`GET /api/catalogo/{categorias, tipos-muestra, examenes}` y sus `/:id` **no requieren autenticación**.
Solo lectura: las escrituras siguen `proteger` + `autorizar('Administrador')`.

| Parámetro | Aplica a | Descripción |
|---|---|---|
| `q` | todos | palabra clave en `nombre`/`descripcion` (regex **escapada**, insensible a mayúsculas) |
| `categoria` | exámenes | id de `CategoriaAnalisis` |
| `tipoMuestra` | exámenes | id de `TipoMuestra` |
| `pagina` / `limite` | todos | default `1` / `10`; **`limite` tope 50** |
| `orden` / `dir` | exámenes | `nombre` · `precio` · `tiempoRespuestaDias` / `asc`\|`desc` |

- Solo se publican exámenes con `activo: true`.
- Respuesta: `{ ok, total, pagina, limite, totalPaginas, data }`.

### 7.2 Pre-solicitud con análisis opcionales

Campos: `tipoMuestra`, `descripcionMuestra`, `origen`, `cantidadEstimada` y **`examenes` (opcional)**.

- `Solicitud.examenes[]` guarda `{ examen, origen, precioUnitario }`.
- **`precioUnitario` es un snapshot del catálogo al momento de elegir** (RF-06): cambiar el precio
  después no altera lo que el cliente ya vio.
- **El precio lo pone el servidor**: el cliente solo envía ids; un id inexistente o inactivo → **400**.
- **Si el cliente no envía `examenes`, la lista queda `[]`** (decisión 2026-10-09). Las sugerencias
  siguen devolviéndose en la respuesta, pero no se guardan solas.
- `examenes` está en la whitelist: solo el personal (Admin/Recepcionista) puede ajustarlo por `PUT`.

### 7.3 Motor de sugerencias (RF-16)

`src/services/sugerencia.service.js` — reglas simples sobre el catálogo:

| Regla | Señal | Puntaje |
|---|---|:--:|
| R1 | `tipoMuestra` coincide con el examen | **+3** |
| R2 | `categoria` coincide con el examen | **+2** |
| R3 | palabra de la descripción aparece en el nombre/descripción del examen | **+1** por palabra |

- Se normaliza a minúsculas, sin acentos, se descartan palabras vacías.
- Cada sugerencia lleva `razones` (`"tipo de muestra"`, `"palabra clave: sulfato"`), se ordena por
  puntaje descendente y se limita (por defecto 10, máximo 50).

**Punto de extensión para IA (RF-11):** el motor es un array `MOTORES`. Para añadir IA sin tocar
controladores: `MOTORES.push(sugerirPorIA)`. `sugerirExamenes()` fusiona puntajes y razones de
todos los motores activos.

### 7.4 Endpoints

| Endpoint | Auth | Devuelve |
|---|---|---|
| `POST /api/solicitudes/sugerencias` | token | `{ ok, total, data: [...] }` |
| `POST /api/solicitudes` | token | `{ ok, data: { codigoPresolicitud, examenes, ... }, sugerencias }` |

El flujo del cliente es: pedir sugerencias → **ajustar la lista** → crear la pre-solicitud con la
lista confirmada.

### 7.5 Criterio de cierre

**Crear una pre-solicitud devuelve su código (`PRE-AAAA-NNNN`) y la lista de exámenes sugeridos.**

---

## 8. Cotización: cálculo, PDF, firma y cupón (RF-06, RF-09, RF-13)

### 8.1 Cálculo (`services/cotizacion.service.js`)

`POST /api/cotizaciones` (Admin/Recepcionista) recibe `{ solicitud, examenes? }` con
`examenes: [{ examen, cantidadMuestras }]`. **Nunca** acepta `valorTotal`, `exonerada` ni `detalles`
(whitelist): el servidor:

1. Lee el precio **vigente** del catálogo (`Examen.activo`); id inválido o inactivo → **400**.
2. Guarda en `detalles[]` un **snapshot** `{ examen, cantidadMuestras, precioUnitario }`.
3. `valorTotal = Σ precioUnitario × cantidadMuestras`.
4. Si el usuario es **SENA verificado** → `valorTotal = 0` y `exonerada = true`.
5. Genera el **PDF** y deja la solicitud en `Cotizada` (409 si no estaba en `Pre-solicitud`).

Si no se envían `examenes`, se cotizan los de la pre-solicitud (cantidad 1).

**SENA verificado** = `Usuario.tipoUsuario === 'SENA'` **o** `VerificacionSena.estado === 'Aprobada'`.

### 8.2 PDF (`services/pdf.service.js`)

- Se guarda en `uploads/cotizaciones/<numeroCotizacion>.pdf` y la ruta queda en `Cotizacion.archivoPdf`.
- `GET /api/cotizaciones/:id/pdf` → **solo el dueño de la solicitud o el Administrador** (403 para
  el resto); sin archivo → 404.
- El acceso directo `/uploads/cotizaciones/...` responde **403** (`index.js`): el PDF solo se
  descarga por el endpoint autorizado.

### 8.3 Aceptar con firma digital (RF-13)

`POST /api/cotizaciones/:id/aceptar` (Cliente dueño, Admin o Recepcionista):

| Campo | Regla |
|---|---|
| `nombreFirmante`, `documentoFirmante` | obligatorios |
| `firmaImagen` | `data:image/(png\|jpg\|jpeg\|webp);base64,...`, máx. ~600 KB → `uploads/firmas/<cotizacion>.png` |
| `aceptaTerminos` | debe ser `true` |

Faltan datos → **400**. Guarda `Solicitud.autorizacion` con `{ ..., fechaHoraFirma, ip }`.
La cotización pasa a `Aceptada`; si ya estaba decidida → **409**.

### 8.4 Cupón (`services/cupones.service.js`)

Se emite **automáticamente al aceptar** si `exonerada === false`; si no, con
`POST /api/cotizaciones` no procede y `POST /pagos/cupones` devuelve:

| Condición | Respuesta |
|---|---|
| cotización ≠ `Aceptada` | **409** |
| `valorTotal ≤ 0` (exonerada) | **400** |
| ya existe cupón para esa cotización | **409** |
| no hay `CuentaRecaudo.activa` | **409** |
| cuentas indicadas no activas | **400** |
| `fechaLimitePago` no futura | **400** |

`fechaLimitePago` = hoy + `ParametroSistema['diasVigenciaCupon']` (**default 15 días**).

### 8.5 Recepción (RF-09)

`POST /api/muestras` exige que la solicitud esté en **`Pagada`** → si está en `Pendiente de pago`
(u otro estado) responde **409**. El exonerado pasa porque su solicitud ya quedó `Pagada`.

### 8.6 Criterios de cierre

1. Un **SENA verificado** acepta la cotización → `valorTotal 0`, solicitud `Pagada`, **sin cupón**,
   y `POST /api/muestras` responde **201**.
2. Un **externo** acepta → solicitud `Pendiente de pago` + **cupón único** emitido; sin cupón
   pagado, `POST /api/muestras` responde **409**.
3. El PDF solo lo descarga el dueño o el Administrador (**403** para el resto).

---

## 9. Pagos: registro, verificación, bandeja y notificaciones (RF-08, RF-09, RF-12, RF-33)

Lógica en `BACKEND/src/services/pagos.service.js`; eventos en `eventos.service.js` y notificaciones
en `notificaciones.service.js`.

### 9.1 Registrar un pago — `POST /api/pagos` (multipart o JSON)

Roles: `Administrador`, `Recepcionista` y `Cliente` (el Analista **no**). El Cliente solo puede
reportar sobre **sus propios cupones** (403 si es ajeno).

| Condición | Respuesta |
|---|---|
| cupón inexistente | **404** |
| cupón **vencido** (`fechaLimitePago < hoy`) | **409** — ya no se admiten nuevos reportes |
| cupón ajeno (Cliente) | **403** |
| método ≠ `Efectivo en caja SENA` y sin `archivoComprobante` | **400** |
| método = `Efectivo en caja SENA` y sin `numeroReciboCaja` | **400** |
| `metodo` fuera del enum, `fechaPagoReportada` inválida o `valorReportado < 0` | **400** |

- `metodo`: `Consignación bancaria` · `Transferencia electrónica` · `Efectivo en caja SENA`.
- El servidor fija **`estado = "Pendiente de verificación"`**, `fechaCarga`, `historial[0]` e ignora
  `estado`/`historial`/`fechaCarga`/`fechaRevision` si llegan en el cuerpo (whitelist, regla #12).
- Un cupón vencido **sí** permite verificar los pagos reportados a tiempo (solo se bloquean nuevos).

### 9.2 Verificar — `PUT /api/pagos/:id/verificar`

Roles: `Administrador`, `Recepcionista` (sin rol Cajero, decisión 2026-10-08).

| Condición | Respuesta |
|---|---|
| estado ≠ `Pendiente de verificación` | **409** |
| `aprobar: false` sin `observacion` | **400** |
| solicitud en estado no convertible a `Pagada` (solo al aprobar) | **409** |

- Siempre guarda `verificadoPor`, `fechaRevision` y agrega el evento al `historial`.
- **Al aprobar:** `Solicitud` `Pendiente de pago → Pagada` y emite el evento **`pagoAprobado`**.
- **Al rechazar:** no toca la solicitud y emite **`pagoRechazado`** con el motivo.

### 9.3 Eventos y notificaciones

| Evento | Notificación al cliente |
|---|---|
| `pagoAprobado` | App + correo (opcional SMTP) con las **instrucciones de muestra** tomadas del `Examen`: cantidad (`cantidadRequerida` + `unidadMedida`), `tipoEnvase`, `temperaturaConservacion` y `tiempoMaxTrasladoHoras` (RF-12) |
| `pagoRechazado` | App + correo con el **motivo** (`observacion`) y la indicación de reintentar desde "Mis pagos" |

Un fallo al notificar **no** rompe la respuesta HTTP de verificación (el emisor traga el error y lo
loguea).

### 9.4 Consultas

- `GET /api/pagos/pendientes` — bandeja solo para `Administrador`/`Recepcionista`, ordenada por
  `fechaCarga` **asc** (más antiguo primero) y paginada (`pagina`, `limite` ≤ 50).
- `GET /api/pagos/mis-pagos` — del Cliente: **solo los suyos**, con `estado` e `historial` de cambios.
- `GET /api/pagos/:id` — incluye el `historial` (el Cliente solo accede al suyo).

### 9.5 Criterios de cierre

1. Reportar comprobante sin archivo (consignación/transferencia) → **400**; en efectivo sin número
   de recibo → **400**.
2. Reportar sobre un cupón vencido → **409**; sobre un cupón ajeno → **403**.
3. Aprobar deja `verificadoPor`/`fechaRevision`, mueve la solicitud a `Pagada` y crea la notificación
   con las instrucciones de los exámenes.
4. Rechazar sin observación → **400**; con observación → notificación con el motivo.
5. `GET /api/pagos/pendientes` devuelve los pendientes del más antiguo al más reciente.
6. Con la solicitud aún `Pendiente de pago`, `POST /api/muestras` sigue respondiendo **409** (RF-09).

---

## 10. Recepción, turnos, rechazo y rótulos (RF-17, RF-18, RF-19, RF-20, RF-21)

### 10.1 Recepción presencial (RF-17)

1. `GET /api/muestras/buscar?codigo=PRE-AAAA-NNNN` (Admin/Recepcionista): devuelve la solicitud con
   sus análisis (parámetros del catálogo), las muestras ya creadas y `aptaRecepcion`.
   **Solo una solicitud `Pagada` es apta** (la exonerada ya nace `Pagada`); si no, `motivo` explica
   por qué (RF-09, regla #1). Sin `?codigo` → **400**; inexistente → **404**.
2. `POST /api/muestras` exige `entregadoPor`, `fechaHoraEntrega`, `cantidadRecibida`,
   `unidadMedida` y `estadoEmpaque`; `estadoInicial` solo admite **`Aceptada`** (default) o
   **`En observación`**. Si algún examen cotizado tiene `requiereTemperatura: true`,
   `temperaturaRecepcion` es **obligatoria** → **400**.
3. El servidor fija: `codigoMuestra` (`A1` SENA / `A2` externo, consecutivo y atómico),
   `prioridad`, **`numeroTurno`** (secuencia diaria atómica `TURNO-AAAA-MM-DD` sobre `Contador`),
   `recepcionista` = usuario autenticado, `examenes[]` copiados de la cotización (snapshot),
   historial con acción **`Recepción`** y la solicitud pasa a **`En proceso`**.
4. `numeroTurno`, `recepcionista`, `analista`, `estado` y `codigoMuestra` en el body se **ignoran**
   (whitelist, regla #12); sin pago aprobado → **409** (RF-09).

### 10.2 Cola de atención (RF-19, RNF-08)

`GET /api/muestras/cola?fecha=AAAA-MM-DD` (Admin/Recepcionista/Analista): muestras del día con
ciclo abierto (excluye `Rechazada`, `Finalizada` y `Cancelada`), orden **A1 antes que A2 y luego
por `numeroTurno` (llegada)**; `enAtencion` es el primer elemento de la cola. La fecha es
opcional (hoy por defecto) y su formato inválido → **400**.

### 10.3 Rechazo (RF-20, reglas #7 y #10)

1. `POST /api/rechazos` (Admin/Recepcionista): **`motivo` obligatorio y del catálogo**
   (`MotivoRechazo`) → sin motivo, id inválido o ajeno al catálogo → **400**; muestra inexistente
   → **404**; muestra ya `Rechazada` → **409**. `observaciones` es opcional pero recomendado.
2. El **acta la genera el servidor** (`pdfkit` → `uploads/rechazos/acta-<codigoMuestra>.pdf`);
   `evidenciaFoto` (JPG/PNG/PDF, máx. 5 MB) es opcional y llega por multer.
3. La muestra pasa a **`Rechazada`** y su ciclo técnico se **cancela** (etapa `Cancelada`,
   terminal); se registra `HistorialMuestra` con acción **`Rechazo`**.
4. El evento `muestraRechazada` notifica al cliente (App + correo) con el motivo y su decisión
   **Reenviar / Recoger**, que se registra con `PUT /api/rechazos/:id/decision`
   (cliente dueño → **403** si no es suyo; Admin/Recepcionista también pueden registrarlo;
   valor distinto de `Reenviar`/`Recoger` → **400**).
5. El catálogo de motivos solo lo modifica el Administrador; `GET`/`PUT /api/rechazos` son del
   personal (Admin/Recepcionista; el `GET` incluye al Analista) y `DELETE` solo Admin.

### 10.4 Rótulo imprimible (RF-21, RF-22)

`GET /api/muestras/:id/rotulo?ancho=58|80` (Admin/Recepcionista/Analista) devuelve **HTML** con
CSS `@page` para papel de 58 mm (default) u 80 mm: código de la muestra, prioridad, turno, fecha
de ingreso y parámetros por examen (cantidad, envase, conservación, tiempo máximo de traslado).
**No contiene ningún dato del cliente** (nombres, correos ni documento) y todo el texto se escapa
(sin inyección HTML). Ancho distinto de `58`/`80` → **400**; muestra inexistente → **404**.

### 10.5 Criterios de cierre

1. La cola devuelve **A1 primero** y, dentro de la misma prioridad, por orden de llegada.
2. **Sin motivo del catálogo no hay rechazo** (400); con motivo, la muestra queda `Rechazada` +
   etapa `Cancelada` y el cliente recibe la notificación con Reenviar/Recoger.
3. Recibir sin pago → **409** (RF-09); con examen de frío y sin `temperaturaRecepcion` → **400**.
4. El rótulo no expone nombres, correos ni documento del cliente (RF-22).
5. `numeroTurno` es consecutivo por día, atómico y **nunca** se acepta desde el body.

---

## 11. Trazabilidad, código ciego y auditoría (RF-22, RF-23, RF-28, RF-29)

### 11.1 Cambio de etapa y porcentaje de avance (RF-23)

`PUT /api/muestras/:id/cambiar-etapa` (Admin/Recepcionista/Analista) valida la transición de la
sección 3.4 (inválida → **409**), escribe en `HistorialMuestra` (acción `Cambio de etapa`, nunca
update/delete) y expone **`porcentajeAvance`** (virtual, no se guarda ni se acepta del body):
Recepción 10 · Análisis 40 · Observaciones 55 · Resultados 75 · Validación 90 · Re-ensayo 70 ·
Finalizada 100 · Cancelada `null`.

- Pasar a **`Re-ensayo` exige `justificacion`** (sin ella → **400**, RF-23); queda como comentario del
  historial.
- El cliente recibe notificación (App + correo) solo en los **hitos**: `Resultados`, `Validación`,
  `Finalizada` y `Re-ensayo`.
- El `PUT /api/muestras/:id` genérico queda en **Admin/Recepcionista** para que el Analista no pueda
  saltarse la justificación escribiendo `etapaActual` directo.

### 11.2 Código ciego del Analista (RF-22, RNF-01)

Toda respuesta del rol activo Analista (`GET /muestras`, `GET /muestras/:id`, cambio de etapa y
`GET /muestras/cola`) pasa por un **DTO técnico** (`services/blindaje.service.js`) con **solo**
código, prioridad, turno, estado/etapa/avance, parámetros y resultado de los exámenes, temperatura y
fechas. **Nunca** incluye `solicitud`/`usuario`, `entregadoPor` ni `observaciones`, y en sus consultas
no se popula `solicitud`.

- **Hoja de trabajo A4 anónima:** `GET /api/muestras/:id/hoja-trabajo` (Admin/Recepcionista/Analista)
  devuelve HTML con código, parámetros, estado/avance, casillas de resultado y firma del analista, sin
  datos del cliente y con el texto escapado.
- **Criterio de aceptación:** ninguna respuesta del rol Analista contiene nombre, correo ni documento
  del cliente.

### 11.3 Asignación, reasignación y reapertura (RF-28, solo Administrador)

- `PUT /api/muestras/:id/asignar` con `{ analista, accion: "Asignar" | "Reasignar", motivo }`: el
  **motivo es obligatorio** (400); el usuario destino debe existir, estar activo y tener el rol
  Analista (400/404); `Asignar` sobre una muestra con analista → **409** (use `Reasignar`) y viceversa;
  escribe historial `Asignación`/`Reasignación` y **notifica al analista**.
- `PUT /api/muestras/:id/reabrir` con `{ motivo, etapaDestino? }`: **solo desde `Finalizada`** (otro
  estado → **409**), motivo obligatorio (400); destino `Validación` por defecto (o `Resultados`/
  `Re-ensayo`); escribe historial `Reapertura` y notifica al analista y al cliente. Una muestra
  `Cancelada` (rechazada) **no** se reabre: el cliente debe reenviar.

### 11.4 Des-anonimización (RF-29, Administrador y Recepcionista)

`PUT /api/muestras/:id/datos-cliente` con `{ contrasena, motivo }`: reautentica al usuario activo con
`bcrypt` (contraseña incorrecta → **401**), exige motivo (**400**), devuelve los datos del cliente
(nombres, apellidos, correo, documento y teléfono) junto al `codigoPresolicitud`, y registra la acción
**`Consulta datos cliente`** en `HistorialMuestra` con el motivo (auditoría; regla inviolable #6).

### 11.5 Criterios de cierre

1. Pasar a `Re-ensayo` sin justificación → **400**; con justificación queda en el historial.
2. Ninguna respuesta del rol Analista expone nombre, correo ni documento del cliente.
3. `Asignar`/`Reasignar`/`Reabrir` sin motivo → **400**; reabrir algo que no está `Finalizada` → **409**.
4. Des-anonimizar con contraseña incorrecta → **401** y con motivo vacío → **400**; toda consulta
   exitosa queda auditada como `Consulta datos cliente`.
5. El historial de muestras sigue siendo inmutable (sin update/delete por API ni por modelo).

---

## 12. Informe, encuesta, cierre y PQR (RF-25, RF-26, RF-31)

### 12.1 Informe de resultados (RF-25) — solo Administrador

- `POST /api/informes` (Administrador, multipart `archivoPdf`): sube el PDF validado; nace **`En revisión`**
  (el servidor fija estado y `revisadoPor: null`).
- `PUT /api/informes/:id/aprobar` (Administrador): `En revisión → Aprobado` (409 si ya lo está) y fija
  `revisadoPor` + `fechaValidacion`.
- Los PDF viven en **`uploads/informes/`** (carpeta protegida): `GET /uploads/informes/...` responde **403**.
- **Máquina de estado:** `En revisión → Aprobado` (terminal).

### 12.2 Descarga protegida del informe (RF-26)

`GET /api/informes/:id/pdf` (Administrador o Cliente dueño, por propiedad) devuelve un **stream autenticado**
(`Content-Disposition: attachment`), **nunca** una ruta pública. El criterio es: **el informe no se descarga
sin encuesta, ni siquiera conociendo la URL**.

- Informe no `Aprobado` → **409**.
- Encuesta ausente o incompleta → **403** con `{ ok:false, codigo:'ENCUESTA_PENDIENTE', ... }`.

### 12.3 Encuesta de satisfacción (RF-26)

`POST /api/encuestas` pasa por `services/encuestas.service.js`:

- **Escala 1-5**: cada `calificacion` debe ser entero entre 1 y 5 (validator y servicio → **400**).
- **Todas las preguntas activas son obligatorias**: si falta alguna → **400** (rechaza envíos incompletos);
  preguntas inactivas/desconocidas → **400**; encuesta ya registrada → **409**; solicitud ajena → **403**.
- Al guardar queda **`completa: true`** (ese flag es el que habilita la descarga del informe).

### 12.4 Cierre de la solicitud (RF-26/RF-15) — automático

`services/cierre.service.js` cierra la solicitud cuando se cumplen **ambas** condiciones: un informe
**`Aprobado`** de alguna muestra y una encuesta **`completa`**. Se dispara al aprobar el informe o al registrar
la encuesta; marca la solicitud en **`Finalizada`** (se reutiliza el estado existente) con `fechaCierre` y
notifica al cliente (App + correo) con el evento `solicitudCerrada`.

### 12.5 PQR / inconformidades (RF-31)

- **Máquina de estado:** `Abierta → En revisión → Resuelta → Cerrada` (una `Resuelta` puede reabrirse a
  `En revisión`; `Cerrada` es terminal).
- `PUT /api/inconformidades/:id` (Administrador): valida la transición (409), exige **respuesta** al pasar a
  `Resuelta` (400), fija **`fechaResolucion`** de forma automática y notifica al usuario.

### 12.6 Criterios de cierre

1. `GET /informes/:id/pdf` sin encuesta completa → **403 `ENCUESTA_PENDIENTE`** (aun con la URL exacta).
2. La encuesta rechaza cualquier envío incompleto o con calificación fuera de 1-5 → **400**.
3. La solicitud solo pasa a `Finalizada` con informe aprobado **y** encuesta completa.
4. Cambiar el estado de una PQR a un valor no permitido → **409**; resolver sin respuesta → **400**; al
   resolver queda `fechaResolucion`.
5. Los PDF de informe no se sirven por `/uploads` (carpeta protegida).

---

## 13. Notificaciones, cron e IA (RF-14, RF-32, RF-11, RNF-09)

### 13.1 Servicio único de notificación (RF-14)

`services/notificaciones.service.js` expone `notificar({ codigo, usuario, solicitud, variables })`:

- Localiza la plantilla en `PlantillaMensaje` por **`codigo`** (único) **en cada envío** (sin caché):
  **editar una plantilla cambia el siguiente mensaje sin reiniciar**.
- Renderiza `{{nombre}}`, `{{orden}}`, `{{estado}}`, `{{fecha}}` y extras (`{{codigoMuestra}}`, `{{motivo}}`,
  `{{instrucciones}}`, `{{dias}}`, …) con `services/plantillas.service.js`.
- Canales: **App** (registro inmediato, `estado: Enviado`) y **Correo** (registro `Pendiente` + encolado
  asíncrono con reintentos).
- Reemplaza las notificaciones sueltas de fases anteriores (pago, rechazo, avance, asignación, cierre, PQR).
- Sin conexión a BD (pruebas) usa un texto de respaldo para no romper el flujo.

### 13.2 Cola asíncrona con reintentos (RNF-09)

`services/colaNotificaciones.service.js`: envía sin bloquear el HTTP, reintenta con backoff hasta
`ParametroSistema` `notificacionMaxIntentos` (default 3) y registra el resultado en la `Notificacion`
(`estado`: `Pendiente`/`Enviado`/`Fallido`, `intentos`, `error`).

### 13.3 Cron de alertas de retraso (RF-32)

`services/cron.service.js` con `node-cron` (arranca en `index.js` tras conectar):

- Frecuencia: `ParametroSistema` `cronAlertaRetraso` (default `0 7 * * *`).
- Umbral: `diasAlertaRetraso` (default 5). Detecta **muestras** sin avance (`updatedAt` antiguo) que **no**
  estén `Finalizada`/`Cancelada`/`Rechazada`, y **cupones** vigentes sin pago aprobado con solicitud
  `Pendiente de pago`.
- Alerta al `correoProduccionCentros` y al cliente (por el servicio único).
- **No repite**: marca `ultimaAlertaRetraso` en `Muestra`/`CuponPago` (una muestra solo se re-alerta si
  registra un nuevo avance).

### 13.4 Asistente IA (RF-11)

`POST /api/asistente/chat` (`{ mensaje, opcionId? }`), autenticado:

- Contexto **solo** con catálogo y `ParametroSistema` (nunca datos de cliente).
- `OpcionAsistenteIA` como prompts predefinidos; historial persistido en `MensajeAsistente` (últimos 10).
- Clave **solo** en `.env` (`IA_API_KEY`; opcional `IA_URL`/`IA_MODELO`). Sin clave → **503**.
- Variables de entorno del sistema (sin credenciales en el repositorio): `MONGODB_URI`, `JWT_SECRET`,
  `MAIL_HOST`/`MAIL_USER`/`MAIL_PASS`/`MAIL_PORT`, `IA_API_KEY`/`IA_URL`/`IA_MODELO`, `PORT`, `CLIENT_URL`,
  `ADMIN_CORREO`/`ADMIN_CONTRASENA`.

### 13.5 Criterios de cierre

1. Editar una plantilla cambia el siguiente envío (el servicio no cachea).
2. El envío de correo es asíncrono, reintenta y deja `estado`/`intentos`/`error` registrados.
3. El cron no repite alertas para el mismo atraso (marca `ultimaAlertaRetraso`).
4. El asistente IA sin `IA_API_KEY` responde **503** y nunca expone datos de clientes.

---

## 14. Dashboard, reportes, auditoría y pruebas (RF-27, RF-30, RF-31)

### 14.1 Dashboard (RF-27)

`GET /api/reportes/dashboard` (Administrador y Recepcionista) devuelve: **muestras por etapa**, **cola
A1/A2** abiertas, **pagos pendientes**, **alertas** (muestras/cupones retrasados según el umbral del cron
y notificaciones no leídas) y **recaudo** (suma de pagos `Pagado`).

### 14.2 Reportes por rango (RF-30)

`GET /api/reportes?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&formato=json|csv|xlsx|pdf` (solo Administrador):
volumen de muestras, **% rechazadas**, **total facturado a externos** y **monto exonerado SENA**.
Exportación en **CSV**, **Excel** (`.xlsx`, `exceljs`) y **PDF** (`pdfkit`).

### 14.3 Auditoría de configuración (RF-27/RF-31)

`utils/crudConAuditoria.js` registra en **`AuditoriaConfiguracion`** (`entidad`, `referencia`, `accion`,
`antes`, `despues`, `usuario`, `fecha`) cada cambio de plantillas, prompts IA, parámetros, tipologías,
catálogo (precios), roles y cuentas de recaudo; además fija `modificadoPor`/`fechaModificacion`.
`GET /api/configuracion/auditoria` (Administrador) lista los cambios.

**Precios:** la cotización guarda un **snapshot** (`detalles[].precioUnitario`); editar el catálogo solo
afecta a órdenes **nuevas**.

### 14.4 Pruebas

- **`npm test`**: `pruebas/flujo.integracion.test.js` (supertest + mongodb-memory-server) recorre el flujo
  completo de **registro a cierre** en una sola prueba.
- **`npm run verificacion`**: verificaciones manuales por función en `BACKEND/verificacion/`.

### 14.5 Criterios de cierre

1. El flujo completo (registro → … → cierre) pasa en **una** prueba automatizada (`npm test`).
2. Dashboard y reportes responden solo a los roles de la matriz §2.
3. Todo cambio de configuración queda auditado con usuario y valores antes/después.
4. Editar un precio del catálogo **no** altera cotizaciones ya emitidas.
