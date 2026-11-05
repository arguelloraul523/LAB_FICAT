# MEMORIA DEL PROYECTO — Sistema de Gestión del Laboratorio (SENA)

> **Documento de verdad única.** Cualquier sesión (humana o IA) debe leer este archivo **antes**
> de tocar el proyecto. Si algo contradice una **regla inviolable** (sección 5), hay que detenerse y
> preguntar. Las decisiones nuevas se registran en la sección 7; nunca se borra historia.
>
> Última actualización: **2026-10-09** · Documento vivo.

---

## 1. Propósito y stack

Sistema web para la gestión integral del **laboratorio de análisis del SENA**: registro de usuarios,
catálogo de exámenes, pre-solicitud, cotización, pago manual verificado, recepción y trazabilidad de
muestras, informes, encuestas, PQR, notificaciones y administración.

| Componente | Tecnología |
|---|---|
| Entorno | Node.js |
| Framework | Express |
| Base de datos | MongoDB Atlas |
| ODM | Mongoose |
| Autenticación | JWT (`jsonwebtoken`) |
| Hash de contraseñas | `bcryptjs` |
| Validación | `express-validator` |
| Subida de archivos | `multer` (JPG/PNG/PDF, máx. 5 MB) |
| Correo | `nodemailer` (opcional vía SMTP) |
| CORS | `cors` |
| Variables de entorno | `dotenv` |

- **Arquitectura:** MVC.
- **Módulo:** ES Modules (`"type": "module"`, Node ≥ 18). Convención: `export default` para módulos
  de un solo valor (modelos, rutas, `asyncHandler`, `crudFactory`, `validators/index`, `config/multer`)
  y `export` nombrado para services, utils, middlewares, controllers y constants; los imports
  relativos llevan extensión `.js` siempre.
- **Raíz del backend:** `BACKEND/` · punto de entrada único **`BACKEND/index.js`**: carga `.env`, configura Express, conecta MongoDB (vía **`src/config/db.js`**), arranca el servidor y, con el flag `--seed`, ejecuta la siembra (`npm run seed`).
- **Scripts:** `npm run dev` (nodemon), `npm start`, `npm run seed`.
- **Diseño de datos original:** `DOCUMENTACION/Scripts/SCRIPT_CORREGIDO.sql` (MySQL) → migrado a MongoDB.
- **Requerimientos fuente:** `DOCUMENTACION/Requerimientos/REQUERIMIENTOS_LABORATORIO Borrador 4.docx` (RF-01..RF-33, RNF-01..RNF-09).
- **Avance previo:** `DOCUMENTACION/AVANCE_BACKEND.md`.
- **Reglas de negocio (contrato):** `DOCUMENTACION/REGLAS_NEGOCIO.md` (matriz rol→permisos, multirrol y máquinas de estado).

---

## 2. Flujo lógico oficial

> Este flujo **no se cambia sin registrar una decisión** en la sección 7.

```
Registro
  → [SENA: verificación de identidad]            (RF-02)
  → Pre-solicitud                                 (RF-16)
  → Cotización (usuario SENA verificado = $0)     (RF-06)
  → Aceptar + firma digital                        (RF-13)
  → Cupón (SOLO si valor > 0)                      (RF-07)
  → Pago + comprobante                             (RF-08, RF-33)
  → Verificación manual del pago                   (RF-09)
  → Correo con instrucciones de muestra            (RF-12)
  → Recepción presencial                            (RF-17)
  → Código A1/A2 + turno                            (RF-18, RF-19)
  → Ingreso o Rechazo                               (RF-20)
  → Rótulo                                          (RF-21)
  → Etapas: Recepción → Análisis → Observaciones → Resultados → Validación
            (Validación puede enviar a Re-ensayo con justificación)   (RF-23)
  → Informe validado                                (RF-25)
  → Encuesta obligatoria                            (RF-26)
  → Descarga                                        (RF-25)
  → Cierre y notificación                           (RF-15)
```

- **Cotización exonerada (SENA):** salta **cupón** y **pago** (no se generan).
- **Código ciego:** desde recepción hasta validación, el área técnica solo ve el código A1/A2, nunca
  datos de identidad del cliente (RF-22, RNF-01).
- **Pago es manual:** el sistema no cobra ni integra pasarela; solo informa cuentas oficiales y
  registra el comprobante para verificación humana (RF-07, RF-08).

---

## 3. Roles y permisos

### 3.1 Roles existentes hoy (según `BACKEND/src/seed.js`)

`Administrador` (= Jefe de Laboratorio, RF-27/31), `Recepcionista`, `Analista`, `Cliente`.

- **Decisión adoptada (2026-10-08, RF-09):** **no se crea** un rol `Cajero`. La verificación de pagos
  la realizan `Administrador` y `Recepcionista`, como hoy. Si más adelante se requiere segregación
  estricta, restringir la verificación a `Administrador`.

### 3.2 Matriz real de permisos (tomada de `BACKEND/src/routes/*`)

> La autorización se hace con `autorizar('Rol', ...)`. Donde solo aparece `proteger`, **cualquier
> usuario autenticado** (incluido `Cliente`) puede ejecutar la acción. ⚠ = hoy excede lo deseable.

| Recurso / acción | Administrador | Recepcionista | Analista | Cliente | Público |
|---|:--:|:--:|:--:|:--:|:--:|
| Auth: registro, login, olvide/restablecer contraseña | ✓ | ✓ | ✓ | ✓ | ✓ |
| Auth: perfil, cambiar contraseña | ✓ | ✓ | ✓ | ✓ | — |
| Usuarios: listar / obtener | ✓ | ✓ | ✓ | ✓ | — |
| Usuarios: crear ⚠ | ✓ | ✓ | ✓ | ✓ | ✓ (sin `proteger`) |
| Usuarios: actualizar ⚠ | ✓ | ✓ | ✓ | ✓ | — |
| Usuarios: eliminar | ✓ | — | — | — | — |
| Verificación SENA: listar / crear solicitud | ✓ | ✓ | ✓ | ✓ | — |
| Verificación SENA: aprobar / rechazar / eliminar | ✓ | — | — | — | — |
| Roles y Módulos: listar | ✓ | ✓ | ✓ | ✓ | — |
| Roles y Módulos: crear / actualizar / eliminar | ✓ | — | — | — | — |
| Catálogo (categorías, tipos, exámenes): listar | ✓ | ✓ | ✓ | ✓ | — |
| Catálogo: crear / actualizar / eliminar | ✓ | — | — | — | — |
| Solicitudes: listar / obtener / crear / actualizar / eliminar ⚠ | ✓ | ✓ | ✓ | ✓ | — |
| Cotizaciones: listar | ✓ | ✓ | ✓ | ✓ | — |
| Cotizaciones: crear / actualizar | ✓ | ✓ | — | — | — |
| Cotizaciones: eliminar | ✓ | — | — | — | — |
| Pagos · cuentas: listar | ✓ | ✓ | ✓ | ✓ | — |
| Pagos · cuentas: crear / actualizar / eliminar | ✓ | — | — | — | — |
| Pagos · cupones: listar | ✓ | ✓ | ✓ | ✓ | — |
| Pagos · cupones: crear | ✓ | ✓ | — | — | — |
| Pagos · cupones: actualizar / eliminar | ✓ | — | — | — | — |
| Pagos: listar / obtener ⚠ | ✓ | ✓ | ✓ (hoy ve pagos ajenos) | Propio | — |
| Pagos: crear (reportar comprobante) | ✓ | ✓ | — | Propio (cupón propio) | — |
| Pagos: verificar (aprobar/rechazar) | ✓ | ✓ | — | — | — |
| Pagos: bandeja de pendientes | ✓ | ✓ | — | — | — |
| Pagos: eliminar | ✓ | — | — | — | — |
| Muestras / historial: listar / obtener ⚠ | ✓ | ✓ | ✓ | ✓ | — |
| Muestras: crear | ✓ | ✓ | — | — | — |
| Muestras: cambiar etapa ⚠ | ✓ | ✓ | ✓ | ✓ | — |
| Muestras: actualizar ⚠ | ✓ | ✓ | ✓ | ✓ | — |
| Muestras: eliminar | ✓ | — | — | — | — |
| Rechazos · motivos: listar | ✓ | ✓ | ✓ | ✓ | — |
| Rechazos · motivos: crear / actualizar / eliminar | ✓ | — | — | — | — |
| Rechazos: listar | ✓ | ✓ | ✓ | ✓ | — |
| Rechazos: crear | ✓ | ✓ | ✓ | — | — |
| Rechazos: actualizar ⚠ | ✓ | ✓ | ✓ | ✓ | — |
| Rechazos: eliminar | ✓ | — | — | — | — |
| Informes: listar / obtener | ✓ | ✓ | ✓ | ✓ | — |
| Informes: crear (subir PDF) | ✓ | — | ✓ | — | — |
| Informes: actualizar ⚠ | ✓ | ✓ | ✓ | ✓ | — |
| Informes: eliminar | ✓ | — | — | — | — |
| Encuestas · preguntas: listar | ✓ | ✓ | ✓ | ✓ | — |
| Encuestas · preguntas: crear / actualizar / eliminar | ✓ | — | — | — | — |
| Encuestas: listar / crear / actualizar ⚠ | ✓ | ✓ | ✓ | ✓ | — |
| Encuestas: eliminar | ✓ | — | — | — | — |
| Notificaciones: todo ⚠ | ✓ | ✓ | ✓ | ✓ | — |
| Configuración (plantillas, IA, parámetros, tipologías): listar | ✓ | ✓ | ✓ | ✓ | — |
| Configuración: crear / actualizar / eliminar | ✓ | — | — | — | — |
| Inconformidades (PQR): listar / crear ⚠ | ✓ | ✓ | ✓ | ✓ | — |
| Inconformidades: actualizar / eliminar | ✓ | — | — | — | — |

**Conclusión:** hoy solo se restringe por rol en las escrituras administrativas del catálogo, cuentas,
cupones, roles, módulos, configuración, motivos y verificación SENA. No hay propiedad por dueño ni
código ciego. El endurecimiento de permisos es una brecha conocida (sección 9).

---

## 4. Máquinas de estado

Definidas por los `enum` de los modelos. En negrita, el estado inicial. Las transiciones se validan
en el servidor (`src/constants/estados.js` + `transicion.middleware.js`); las inválidas responden
**409**. Detalle y actores por transición en `DOCUMENTACION/REGLAS_NEGOCIO.md` (sección 3).

### 4.1 Solicitud (`Solicitud.estado`)

Estados: `Pre-solicitud`, `Cotizada`, `No aceptada`, `Pendiente de pago`, `Pagada`, `En proceso`,
`Finalizada`, `Cancelada`. Inicial: **`Pre-solicitud`**.

```
Pre-solicitud ──▶ Cotizada ──┬──▶ No aceptada
                             ├──▶ Pendiente de pago ──▶ Pagada ──▶ En proceso ──▶ Finalizada
                             └──▶ (exonerada SENA) ─────────────▶ En proceso ──▶ Finalizada
Cualquier estado (no terminal) ──▶ Cancelada
```

### 4.2 Cotización (`Cotizacion.estado`)

Estados: `Enviada`, `Aceptada`, `No aceptada`. Inicial: **`Enviada`**.

```
Enviada ──▶ Aceptada
        └─▶ No aceptada
```

### 4.3 Pago (`Pago.estado`)

Estados: `Pendiente de verificación`, `Pagado`, `Rechazado`. Inicial: **`Pendiente de verificación`**.

```
Pendiente de verificación ──▶ Pagado
                          └─▶ Rechazado     (exige observación)
```

### 4.4 Muestra

**Estado** (`Muestra.estado`): `Recibida`, `Aceptada`, `En observación`, `Rechazada`. Inicial: **`Recibida`**.
```
Recibida ──┬──▶ Aceptada
           ├──▶ En observación ──┬──▶ Aceptada
           │                     └──▶ Rechazada
           └──▶ Rechazada
```

**Etapa** (`Muestra.etapaActual`): `Recepción`, `Análisis`, `Observaciones`, `Resultados`, `Validación`,
`Re-ensayo`, `Finalizada`. Inicial: **`Recepción`**.
```
Recepción ──▶ Análisis ──▶ Observaciones ──▶ Resultados ──▶ Validación ──▶ Finalizada
                                                            Validación ──▶ Re-ensayo (exige justificación)
                                                            Re-ensayo  ──▶ Análisis / Observaciones / Resultados
```

---

## 5. Reglas inviolables

Cada regla es obligatoria y tiene su RF/RNF. **Si una tarea contradice alguna, detenerse y preguntar.**

1. **Sin pago aprobado o exoneración no se recibe ni procesa la muestra** (RF-09, "práctica en bolsillo").
2. **Solo el usuario con `tipoUsuario === 'SENA'` obtiene cotización $0 y prefijo A1** (RF-02, RF-06,
   RF-18). La exoneración se evalúa por `tipoUsuario`; ese campo debe administrarse en el servidor y
   nunca aceptarse ciegamente desde `req.body` (endurecer el registro es una tarea pendiente).
3. **Los códigos son consecutivos y atómicos, nunca aleatorios**, formato `PRE/COT/CUP-AAAA-NNNN` y
   `A1/A2-AAAA-NNNN` (RF-18). No aplica a identificadores internos de Mongo.
4. **`HistorialMuestra` es inmutable:** nunca `update` ni `delete` (RF-24).
5. **El Analista nunca recibe datos del cliente: código ciego** (RF-22, RNF-01).
6. **Des-anonimizar exige contraseña (reautenticación) y motivo, y queda auditado** (RF-29).
7. **Rechazar un pago exige observación; rechazar una muestra exige motivo parametrizado** (RF-09, RF-20).
8. **Re-ensayo exige justificación** (RF-23).
9. **El informe no se descarga sin encuesta completa al 100%** (RF-26).
10. **El Cliente solo accede a sus propios registros** (RF-33, RNF-07).
11. **La cotización guarda el precio como snapshot;** cambiar precios del catálogo no afecta
    cotizaciones existentes (RF-06).
12. **El rol y el estado nunca se aceptan desde `req.body`;** se derivan de reglas de servidor
    (RNF-07). Se aplica vía whitelist en `crudFactory` (`src/constants/camposPermitidos.js`), el
    registro público fija `Cliente`/`EXTERNO`, y solo un `cambiar-rol` explícito cambia el rol activo.
13. **Los registros de auditoría no pueden editarse ni eliminarse por ningún rol** (RF-24).

---

## 6. Convenciones

- **Lógica de negocio en `src/services/`** y **controladores delgados**. *(Ya existen
  `src/services/codigos.service.js` —códigos consecutivos atómicos— y `src/services/sena.service.js`
  —exoneración SENA—.)*
- **Constantes de dominio en `src/constants/`:** `estados.js` (máquinas de estado) y
  `camposPermitidos.js` (whitelist del body). No duplicar listas de estados en controladores.
- **Respuestas uniformes:** `{ ok: true, data }` o `{ ok: true, total, data }` para listas, y
  `{ ok: false, mensaje }` para errores.
- **Mensajes en español**, claros y orientados al usuario.
- **Nombres en camelCase** para campos y variables (traducción de `SNAKE_CASE` del SQL).
- **Sin credenciales ni secretos en código:** todo va por variables de entorno (`BACKEND/.env`).
- **No exponer** `contrasenaHash` (el modelo lo marca `select: false`).
- **Validar entrada** con `express-validator` cuando exista validador; idealmente whitelist de campos.
- **Módulos ES (ESM)** desde 2026-10-09 (`"type": "module"`): `export default` en los módulos de un
  solo valor (modelos, rutas, `asyncHandler`, `crudFactory`, `validators/index`, `config/multer`);
  `export` nombrado en services, utils, middlewares, controllers y constants. Los imports relativos
  **siempre** con extensión `.js`; `__dirname` se deriva con `fileURLToPath(import.meta.url)`.

---

## 7. Registro de decisiones (ADR)

> Toda decisión nueva se **agrega** al final. Las decisiones reemplazadas se marcan
> **"Reemplazada por…"**, nunca se borran.

| Fecha | Decisión | Motivo | Alternativa descartada |
|---|---|---|---|
| 2026-10-07 | Migrar de **MySQL** (`SCRIPT_CORREGIDO.sql`) a **MongoDB Atlas** con Mongoose | Flexibilidad de esquema y despliegue en la nube del SENA | Mantener MySQL relacional con joins y migraciones |
| 2026-10-07 | Modelar las **tablas N:M como embebidos o arrays de referencias**: `ROL_MODULO`→`Rol.modulos[]`, `AUTORIZACION`→`Solicitud.autorizacion`, `DETALLE_COTIZACION`→`Cotizacion.detalles[]`, `CUPON_CUENTA`→`CuponPago.cuentas[]`, `MUESTRA_EXAMEN`→`Muestra.examenes[]`, `RESPUESTA_ENCUESTA`→`Encuesta.respuestas[]` | Evitar colecciones puente y simplificar lecturas del flujo | Conservar tablas intermedias como colecciones con `$lookup` |
| 2026-10-07 | Arquitectura **MVC + CommonJS** con Express y Mongoose **(Reemplazada por el ADR del 2026-10-09: ES Modules)** | Simplicidad, familiaridad y tiempos del proyecto académico | TypeScript + ESM con capa `services` desde el inicio |
| 2026-10-08 | Autorización por **nombre de rol en la ruta** (`autorizar('Administrador', ...)`) | Implementación directa y legible | Permisos por módulo (`Rol.modulos[]`) evaluados en middleware |
| 2026-10-08 | Adoptar **`src/services/` para la lógica de negocio** y dejar controladores delgados | Regla del proyecto; facilita pruebas y evita duplicar lógica | Seguir metiendo la lógica en controladores y en `crudFactory` |
| 2026-10-08 | **No crear rol `Cajero`;** la verificación de pagos sigue en `Administrador` y `Recepcionista` (RF-09) | No ampliar la matriz de roles con el equipo actual | Crear un rol `Cajero` dedicado a verificar pagos |
| 2026-10-08 | **Exonerar por `tipoUsuario === 'SENA'`** en la cotización (RF-02, RF-06) | Regla indicada por el negocio | Exigir `VerificacionSena.estado === 'Aprobada'` para exonerar |
| 2026-10-08 | **Códigos consecutivos y atómicos** con la colección `Contador` (`$inc` + upsert) (RF-18) | Garantiza unicidad y consecutividad bajo concurrencia | Códigos aleatorios con `Math.random` (descartado) |
| 2026-10-08 | **`HistorialMuestra` inmutable:** controlador solo-lectura + hooks que bloquean update/delete (RF-24) | Blindar la auditoría tanto en la API como en el modelo | Confiar solo en no exponer rutas de escritura |
| 2026-10-08 | Mantener el enum de `HistorialMuestra.accion` y usar `'Consulta datos cliente'` para RF-29 | Valor ya existente; sin migración | Renombrar a `'Des-anonimización'` (descartado por ahora) |
| 2026-10-08 | **Consolidar entorno, Express, conexión y seed en un único `BACKEND/index.js`** y eliminar `src/app.js`, `src/server.js`, `src/seed.js` y `src/config/db.js` | Un solo punto de entrada; seed con `node index.js --seed` | Mantener los archivos separados (`app.js` + `server.js` + `config/db.js`) |
| 2026-10-08 | **Restaurar `src/config/db.js`** (revertir esa parte): la conexión a MongoDB vuelve a vivir en `src/config/db.js` (`conectarDB`/`desconectarDB`); `index.js` la importa | Separar infraestructura (conexión) del arranque; `index.js` sigue siendo el único punto de entrada | Dejar la conexión inline en `index.js` (descartado) |
| 2026-10-08 | **Consecutivos de 4 dígitos** (`PRE/COT/CUP-AAAA-NNNN`, `A1/A2-AAAA-NNNN`) | Formato pedido por el negocio; evita agotar la serie anual | Mantener 3 dígitos |
| 2026-10-08 | **Usuario multirrol** (`roles[]` asignados + `rol` activo) con `POST /api/auth/cambiar-rol` | Una persona puede ser Recepcionista y Analista sin mezclar permisos en la sesión (RF-22) | Dos cuentas para la misma persona |
| 2026-10-08 | **Registro público fuerza `rol = Cliente` y `tipoUsuario = 'EXTERNO'`** en servidor; `rol`/`tipoUsuario` fuera del body | Cierra el agujero de autoproclamarse Administrador o SENA y obtener `$0` (RF-02, RF-06, regla #12) | Aceptar `rol`/`tipoUsuario` del body |
| 2026-10-08 | **Whitelist de campos en `crudFactory`** (`src/constants/camposPermitidos.js`): descarta `rol`, `estado`, códigos y valores de servidor | Regla inviolable #12; el estado solo entra si lo habilita un middleware de transición | Seguir pasando `req.body` directo |
| 2026-10-08 | **Transiciones de estado validadas en servidor** (`estados.js` + `transicion.middleware.js`); inválida → **409** | RF-18/20/23; cierra la brecha de estados arbitrarios | Validar dentro de cada controlador |
| 2026-10-08 | **Propiedad de registros:** `filtrarPropios`/`exigirPropietario` (Cliente solo lo suyo, si no 403) | RF-33, RNF-07; el Analista sigue con código ciego por rol | Permisos solo por rol sin propiedad |
| 2026-10-08 | **Endurecer HTTP:** `helmet`, `express-rate-limit` en `/auth` y límite de body a `1mb` | RNF de seguridad; mitiga fuerza bruta y payloads grandes | Sin cabeceras ni límites |
| 2026-10-08 | **Vulnerabilidades `high` de `npm audit`: aceptadas y documentadas** (solo dev: `nodemon→chokidar→braces`; no llegan a producción) | `nodemon` no admite `chokidar` 4; se decide no romper el dev-server | Cambiar a `node --watch` (descartado) o `npm audit fix --force` |
| 2026-10-09 | **Catálogo público sin token** (RF-05): `GET /api/catalogo/*` con `q`, `categoria`, `tipoMuestra`, `pagina`, `limite` (tope 50) y `orden` | El catálogo es la vitrina del laboratorio; solo lectura y solo `activo: true` | Exigir token para ver el catálogo |
| 2026-10-09 | **Snapshot de precio en la pre-solicitud** (`Solicitud.examenes[].precioUnitario` leído por el servidor) | El cliente ve fijo lo que eligió; el precio solo lo pone el servidor (RF-06, reglas #11/#12) | Guardar solo los `ObjectId` y calcular al cotizar |
| 2026-10-09 | **Si el cliente no envía `examenes`, la lista queda vacía** (no se guardan las sugerencias) | El cliente confirma siempre de forma explícita la lista final | Autocompletar con las sugerencias (descartado) |
| 2026-10-09 | **Motor de sugerencias de reglas con `MOTORES[]`** (`services/sugerencia.service.js`) y `POST /solicitudes/sugerencias` | RF-16 con puntaje + razones; punto de extensión para IA (RF-11) sin tocar controladores | Integrar IA directamente en el controlador |
| 2026-10-09 | **Amplía el criterio "SENA verificado"**: `tipoUsuario === 'SENA'` **o** `VerificacionSena.estado === 'Aprobada'` (`esSenaExonerado` ahora es **async**) | El registro público nace `EXTERNO`, así que nadie podía llegar a SENA sin edición manual; el ADR del 2026-10-08 quedaba incompleto | Exigir solo `tipoUsuario` y que el admin edite a mano cada usuario |
| 2026-10-09 | **`calcularCotizacion` en servidor** (`services/cotizacion.service.js`): totales y `detalles[]` protegidos en la whitelist | El precio solo sale del catálogo vigente; `valorTotal`/`exonerada`/`detalles` dejan de aceptarse desde `req.body` | Dejar que el cliente envíe el total (descartado) |
| 2026-10-09 | **PDF con `pdfkit`** en `uploads/cotizaciones/` y descarga `GET /cotizaciones/:id/pdf` solo para dueño o Administrador | Adjunto verificable de la cotización (RF-06) sin depender de storage externo | Generar el PDF bajo demanda y no guardarlo (descartado) |
| 2026-10-09 | **Firma digital guardada como archivo** `uploads/firmas/<cotizacion>.png`; en `Solicitud.autorizacion` solo la ruta + fecha/hora + `ip` | La imagen base64 no debe inflar el documento Mongo (RF-13) | Guardar el base64 en Mongo (descartado) |
| 2026-10-09 | **Cupón emitido por el servidor al aceptar** (`services/cupones.service.js`): cotización `Aceptada`, `valorTotal > 0`, un solo cupón, cuentas `activa` y vigencia desde `ParametroSistema` (`diasVigenciaCupon`, default 15) | Un externo no puede avanzar sin cupón y nadie puede crear dos; la exonerada no genera cupón (RF-09) | Que el cliente pida el cupón después (descartado) |
| 2026-10-09 | **Transición `Cotizada → Pagada`** reservada al servidor para la vía exonerada; el camino normal sigue `Cotizada → Pendiente de pago → Pagada` | Permite que un SENA verificado llegue a recepción sin cupón dentro de la misma máquina de estados | Hacer el salto con `$set` fuera de `TRANSICIONES` (descartado) |
| 2026-10-09 | **RF-09 en recepción**: `crearMuestra` responde **409** si la solicitud no está `Pagada` | Cierra el criterio "un externo no avanza sin cupón"; el exonerado pasa porque su solicitud ya está `Pagada` | Validar el pago comparando con `CuponPago` (más frágil) |
| 2026-10-09 | **Verificación SENA solo con `correoInstitucional` `@sena.edu.co`** (exacto, sin subdominios): `constants/sena.js` compartido por validador, `match` del modelo y bloqueo al **aprobar** (400) | El usuario corrigió la regla: antes no había ninguna restricción de dominio. Se valida en 3 capas y **rechazar sigue permitido** para documentos heredados | Aceptar subdominios (`@virtual.sena.edu.co`) o validar solo en el validador |
| 2026-10-09 | **Historial de pagos como subdocumento `Pago.historial[]`** (estado, fecha, usuario, observación), escrito solo por el servidor y añadido a la whitelist | El Cliente debe ver sus cambios de estado (RF-33) y el pago viaja con su auditoría sin crear otra colección ni consulta en dos pasos | Colección `HistorialPago` aparte al estilo `HistorialMuestra` |
| 2026-10-09 | **Bus de eventos `pagoAprobado` / `pagoRechazado`** en `services/eventos.service.js` (EventEmitter); los manejadores crean `Notificacion` (canal App) y envían correo opcional con `mailer`, y **un fallo al notificar nunca rompe la respuesta HTTP** | RF-12 (instrucciones de muestra al aprobar) y RF-09/RF-33 (motivo al rechazar) sin acoplar la verificación al envío | Notificar inline en el controlador (acoplamiento) o cola/worker externo (sobre-ingeniería para el proyecto) |
| 2026-10-09 | **Las instrucciones de muestra salen del `Examen` de la cotización** (`cantidadRequerida`+`unidadMedida`, `tipoEnvase`, `temperaturaConservacion`, `tiempoMaxTrasladoHoras`) | RF-12 pide datos técnicos del examen; la cotización ya snapshot-ea los exámenes elegidos | Redactar un texto libre por plantilla (RF-14 sigue pendiente) |
| 2026-10-09 | **Cupón vencido bloquea nuevos reportes (409), no la verificación** de pagos ya enviados a tiempo | Criterio literal del usuario; un comprobante entregado antes del vencimiento sigue siendo válido | Bloquear también la aprobación (más estricto, descartado) |
| 2026-10-09 | **Registro de pagos restringido a `Administrador`, `Recepcionista` y `Cliente` dueño del cupón** (el Analista queda fuera) y cupón ajeno → 403 | Regla #10 (el Cliente solo accede a lo suyo) y RF-22 (el Analista no maneja datos de pago) | Dejar `POST /pagos` abierto a cualquier autenticado (antes era el caso) |
| 2026-10-09 | **Se mantiene la verificación en `Administrador` + `Recepcionista`**; "Cajero" del requisito se interpreta como la Recepcionista, **sin crear el rol** | Confirma el ADR del 2026-10-08 (decisión del usuario) | Crear rol `Cajero` o restringir a solo Administrador |
| 2026-10-09 | **Migración a ES Modules** (`"type": "module"` + `engines.node >= 18`): `export default` para módulos de un solo valor (modelos, rutas, `asyncHandler`, `crudFactory`, `validators/index`, `config/multer`), `export` nombrado para services/utils/middlewares/controllers/constants, extensión `.js` explícita en imports relativos y `__dirname` vía `fileURLToPath(import.meta.url)` | Ecosistema actual (Node ≥ 18): imports estáticos, resolución temprana de errores y una sola convención en todo el backend; reemplaza el ADR "MVC + CommonJS" del 2026-10-07 | Mantener CommonJS y migrar solo los archivos nuevos |
| 2026-10-09 | **Turno diario atómico**: `numeroTurno` = secuencia diaria sobre `Contador` (serie `TURNO-AAAA-MM-DD`, `$inc` + upsert) asignada en `crearMuestra`; cola `GET /muestras/cola` ordenada **A1 → A2 → turno asc** con `enAtencion` | RF-19/RNF-08 piden prioridad A1/A2 y orden de llegada; reutiliza el patrón atómico de los códigos (RF-18), dos recepciones concurrentes nunca comparten turno | Contador global sin reinicio diario; turno aleatorio; cola solo por `fechaIngreso` sin número |
| 2026-10-09 | **Estado inicial de recepción `Aceptada` (default) o `En observación`**; `Recibida` queda solo como valor histórico (enum y máquina intactos para documentos viejos) | RF-17: la recepción decide en el acto si la muestra entra o queda observada; un estado intermedio obligatorio solo ralentiza | Eliminar `Recibida` del enum (rompe documentos antiguos) o seguir naciendo en `Recibida` |
| 2026-10-09 | **`temperaturaRecepcion` obligatoria si algún examen cotizado tiene `requiereTemperatura`** (validación cross-model en `services/muestras.service.js`) | RF-17: una muestra de frío sin temperatura registrada es intratable; el flag vive en el catálogo y solo el servidor puede cruzar cotización + catálogo | Validar solo con el body (no sabe si el análisis pide frío) o avisar sin bloquear |
| 2026-10-09 | **Acta de rechazo generada por el servidor** con `pdfkit` → `uploads/rechazos/acta-<codigoMuestra>.pdf`; `Rechazo.actaPdf` deja de subirse por multer | RF-20: el acta debe ser consistente y no editable por el usuario (mismo patrón que el PDF de cotización) | Seguir subiendo el acta como archivo del usuario |
| 2026-10-09 | **Nueva etapa terminal `Cancelada`** en `etapaActual` + transición **`Aceptada → Rechazada`** habilitada; `Cancelada` solo la escribe el servidor al rechazar (sin entradas en la máquina para clientes) | RF-20: "el ciclo técnico se cancela" debe distinguirse de una finalización normal; una muestra aceptada que se degrada también se rechaza | Reutilizar `Finalizada` (mezcla cancelado con completado) o no añadir `Aceptada → Rechazada` |
| 2026-10-09 | **Rótulo RF-21 como HTML imprimible** (`@page { size: 58mm\|80mm }`) en `GET /muestras/:id/rotulo`, con código, parámetros y fecha, y **sin ningún dato del cliente** (RF-22) + texto escapado | El navegador imprime directo el papel térmico sin fuentes ni tamaños que ajustar; el Analista ve el rótulo completo sin riesgo de ceguera | PDF con `pdfkit` en tamaño personalizado (58/80 mm) |
| 2026-10-09 | **`recepcionista` y `analista` añadidos a la whitelist** (solo-servidor): `recepcionista` = usuario autenticado en recepción; `analista` queda reservado para el flujo de asignación (Fase 6) | Regla #12: cerraba la inyección de `recepcionista`/`analista` por `POST /muestras` y `PUT /muestras/:id` | Dejarlos editables desde el body (como estaba) |
| 2026-10-09 | **Rechazos acotados por rol**: `GET` solo personal (Admin/Recepcionista/Analista), `POST`/`PUT` solo Admin/Recepcionista y `PUT /:id/decision` además para el cliente **dueño** (403 si no es suyo); decisión solo `Reenviar`/`Recoger` | La matriz §2 lo declara así, el Cliente no debe ver rechazos ajenos (RF-22/#10) y antes el `PUT` estaba abierto a cualquier rol (hasta el Cliente podía editarlo) | Dejar `GET`/`PUT` abiertos a cualquier autenticado (como estaba) |
| 2026-10-09 | **Cambio de etapa en `services/muestras.service.js`** (`cambiarEtapaMuestra`): `porcentajeAvance` como **virtual** del schema `Muestra` (Recepción 10 · Análisis 40 · Observaciones 55 · Resultados 75 · Validación 90 · Re-ensayo 70 · Finalizada 100 · Cancelada `null`), **justificación obligatoria** al pasar a `Re-ensayo` (400) y notificación al cliente (App + correo) solo en hitos (`Resultados`, `Validación`, `Finalizada`, `Re-ensayo`) | RF-23 pide justificar el re-ensayo y el negocio pidió informar el avance; concentrar los hitos evita spam y el virtual no se guarda ni se acepta del body | Guardar `porcentajeAvance` en el documento o notificar cada transición (incluida `Análisis`/`Observaciones`) |
| 2026-10-09 | **Código ciego del Analista con DTO técnico** (`services/blindaje.service.js` + `esAnalista`): `listar`/`obtener`/respuesta de `cambiar-etapa`/`cola` devuelven solo código, prioridad, turno, estado/etapa/avance, parámetros y resultado de los exámenes, temperatura y fechas; **nunca** se popula `solicitud`/`usuario` ni se exponen `entregadoPor`/`observaciones`; **hoja de trabajo A4 anónima** (`GET /muestras/:id/hoja-trabajo`). `PUT /muestras/:id` genérico pasa a **Admin/Recepcionista** (el Analista no puede saltarse la justificación del Re-ensayo por la puerta ancha) | Regla inviolable #5 y RF-22/RNF-01: el Analista no debe poder recibir nombre, correo ni documento del cliente por ninguna respuesta | Filtrar campos a mano en cada controlador (se olvida uno) o confiar en no poblar (frágil) |
| 2026-10-09 | **Asignación / reasignación / reapertura (RF-28) solo Administrador** con **motivo obligatorio** (400): `PUT /muestras/:id/asignar` (`Asignar`/`Reasignar`, valida que el destino tenga rol Analista y notifica al analista) y `PUT /muestras/:id/reabrir` (**solo desde `Finalizada`**, destino `Validación` por defecto o `Resultados`/`Re-ensayo`, notifica analista y cliente) | RF-27/28 reservan estas acciones al Jefe de Laboratorio; la reapertura de una muestra `Cancelada` (rechazada) no aplica porque el cliente debe reenviar | Permitir reapertura desde cualquier estado o que el propio Analista se reasigne |
| 2026-10-09 | **Des-anonimización (RF-29) para Administrador y Recepcionista** con `PUT /muestras/:id/datos-cliente`: exige **contraseña** (reautenticación `bcrypt` del usuario activo → 401 si falla) y **motivo** (400), devuelve los datos del cliente y registra la acción **`Consulta datos cliente`** en `HistorialMuestra` con el motivo | Regla inviolable #6: ver la identidad exige reautenticación y deja rastro auditable; Recepción también necesita contactar al cliente | Solo Administrador (descartado por el usuario) o registrar la consulta en una colección aparte |
| 2026-10-09 | **Informe (RF-25) solo Administrador**: `POST /informes` (subida, nace `En revisión`) y `PUT /informes/:id/aprobar` (`En revisión → Aprobado`, fija `revisadoPor`/`fechaValidacion`); el PDF se guarda en **`uploads/informes/`** (añadida a `CARPETAS_PROTEGIDAS`) y se descarga por **stream autenticado** `GET /informes/:id/pdf` (Admin + Cliente dueño), **nunca** por `/uploads`; sin informe aprobado → 409 y sin encuesta completa → **403 `{ codigo: 'ENCUESTA_PENDIENTE' }`** | RF-25 (firma del Jefe) y RF-26 (el informe no se descarga sin encuesta, ni conociendo la URL); antes el PDF caía en la raíz pública de `/uploads` y el `PUT` genérico dejaba escribir `estado` | Dejar el PDF en la raíz pública o permitir que el Analista descargue/edite el informe |
| 2026-10-09 | **Encuesta de satisfacción (RF-26) escala 1-5 obligatoria**: `services/encuestas.service.js` valida contra **todas las preguntas activas** (faltantes/fuera de rango/preguntas inactivas → 400, duplicada → 409, ajena → 403) y marca `completa: true`; el modelo `Encuesta` gana `completa` y `respuestas[].calificacion` pasa a `min:1 max:5` | "Rechaza envíos incompletos": la descarga del informe se apoya en un flag explícito y no en recalcular respuestas (que una pregunta nueva rompería retroactivamente) | Calcular la completitud en cada descarga comparando longitudes |
| 2026-10-09 | **Cierre automático de la solicitud** (`services/cierre.service.js`): al aprobar el informe o registrar la encuesta, si hay informe `Aprobado` + encuesta `completa` la solicitud pasa a **`Finalizada`** (se **reutiliza** el estado existente, sin crear `Cerrada`) con `fechaCierre` y evento `solicitudCerrada` (App + correo) | Decisión del usuario (reutilizar `Finalizada`); el cierre no debe depender de que alguien lo dispare a mano | Añadir un estado nuevo `Cerrada` o un endpoint manual de cierre |
| 2026-10-09 | **PQR (RF-31) con máquina de estados** `Abierta → En revisión → Resuelta → Cerrada` (y `Resuelta → En revisión`): `services/inconformidades.service.js` valida la transición (409), exige `respuesta` al resolver (400), fija `fechaResolucion` y notifica al usuario; el modelo gana `respuesta` | El requisito pide "flujo de estados y resolución con fecha"; antes era un `PUT` plano con `permitirCampos` | Dejar el estado como texto libre sin máquina |
| 2026-10-09 | **Servicio único de notificación con plantilla por `codigo`** (`services/notificaciones.service.js` + `services/plantillas.service.js`): `notificar({codigo, variables, usuario})` resuelve la plantilla **en cada envío** (sin caché), renderiza `{{nombre}}`/`{{orden}}`/`{{estado}}`/`{{fecha}}`… y reemplaza las notificaciones sueltas de fases anteriores; `PlantillaMensaje` gana `codigo` único y `canal` `['Correo','App','Ambos']`, con **seed** y `$setOnInsert` (re-sembrar no pisa lo editado). Si no hay BD (pruebas offline) usa un texto de respaldo por canal App | RF-14: editar una plantilla debe cambiar el siguiente correo sin reiniciar; un punto único evita el texto disperso. El fallback permite verificar sin Mongo | Cachear plantillas (rompe el criterio) o buscar por `nombre` (frágil ante renombres) |
| 2026-10-09 | **Cola de correo asíncrona con reintentos** (`services/colaNotificaciones.service.js`): `Notificacion` gana `estado` (`Pendiente`/`Enviado`/`Fallido`), `intentos` y `error`; cada envío de correo se encola (no bloquea el HTTP), reintenta con backoff (`notificacionMaxIntentos`, default 3) y registra el resultado | RNF-09: el envío multicanal no puede acoplar ni demorar la respuesta HTTP; el resultado queda auditable | Enviar síncrono best-effort (como antes: sin reintentos ni registro) |
| 2026-10-09 | **Cron de retrasos con `node-cron`** (`services/cron.service.js`, arrancado desde `index.js`): detecta muestras/cupones sin avance por más de `diasAlertaRetraso` (excluye `Finalizada`/`Cancelada`/`Rechazada`; cupón vigente sin pago aprobado con solicitud `Pendiente de pago`), alerta al `correoProduccionCentros` y al cliente, y marca `ultimaAlertaRetraso` para **no repetir** | RF-32: alertar retrasos sin spamear; el parámetro y la expresión cron son configurables desde `ParametroSistema` | Enviar la alerta cada día sin marca (repite) o cron hardcodeado |
| 2026-10-09 | **Asistente IA acotado** (`POST /api/asistente/chat` + `services/asistente.service.js`): contexto = catálogo + `ParametroSistema` (nunca datos de cliente), `OpcionAsistenteIA` como prompts, **historial persistido** en `MensajeAsistente` (últimos 10), llamada OpenAI-compatible con `fetch` y clave **solo** en `.env` (`IA_API_KEY`/`IA_URL`/`IA_MODELO`); sin clave → 503 | RF-11 con seguridad de datos (RF-22) y sin filtrar credenciales al repositorio; sin dependencia extra (fetch nativo) | Enviar el historial desde el cliente (falsificable) o incrustar la clave en el código |
| 2026-10-09 | **Dashboard y reportes con agregaciones de Mongo** (`services/reportes.service.js`): `GET /reportes/dashboard` (Admin/Recepcionista) y `GET /reportes?desde&hasta` (Admin) con exportación vía `services/export.service.js` (CSV, **Excel con `exceljs`**, PDF con `pdfkit`) | RF-27/RF-30; separar el cálculo de la presentación y no reimplementar cada formato | Exportar solo JSON o armar el .xlsx a mano |
| 2026-10-09 | **Auditoría de configuración** con `AuditoriaConfiguracion` + `utils/crudConAuditoria.js`: cada crear/actualizar/eliminar de plantillas, prompts IA, parámetros, tipologías, catálogo (precios), roles y cuentas de recaudo registra `antes`/`despues` y `modificadoPor`/`fechaModificacion`; `GET /configuracion/auditoria` (Admin) | RF-27/RF-31 "quién cambió qué"; un wrapper reutilizable evita repetir el código en cada controlador | Auditar solo algunos recursos o dejar los campos `modificadoPor` sin llenar |
| 2026-10-09 | **Prueba de integración con `supertest` + `mongodb-memory-server`** (`pruebas/flujo.integracion.test.js`, `npm test`): monta la app desde `src/routes/index.js` sobre una BD efímera y recorre de registro a cierre en una sola prueba; verificaciones manuales por función movidas a `verificacion/` (`npm run verificacion`) | Criterio de cierre de la Fase 9; una BD en memoria no toca Atlas ni exige configuración. La prueba **detectó dos bugs reales** de la aceptación de cotización (validador `aceptaTerminos` y orden de `emitirCupon`), corregidos | Probar contra Atlas (arriesga datos reales) o dejar solo pruebas manuales |
| 2026-10-19 | **Whitelist en `crearSolicitud`** (`solicitud.controller.js`): se aplica `sanitizarBody` y el servidor fija `estado:'Pre-solicitud'`, `exonerada:false`, `autorizacion:null`, `fechaCierre:null` y el `codigoPresolicitud` | Cierra el bypass de pago (RF-09): un Cliente podía inyectar `estado:'Pagada'` y recibir muestra sin pagar | Confiar en que el validador de express-validator rechace campos extra (no lo hace) |
| 2026-10-19 | **Código ciego completo (RF-22/RNF-01):** el rol **Analista** queda excluido de `GET /solicitudes`, `GET /cotizaciones` (listar/obtener/PDF) y `GET /pagos` vía `autorizar('Administrador','Recepcionista','Cliente')` | La cotización (y su PDF) y la solicitud exponen identidad del cliente (nombre, correo, firma); el Analista solo debe ver código ciego | Dejar la lectura de solicitudes/cotizaciones/pagos abierta a cualquier autenticado |
| 2026-10-19 | **Propiedad del historial de muestras** (`alcances.historial`): `GET /muestras/historial` y `/:id` filtran por dueño para el Cliente | El Cliente solo accede a sus propios registros (regla #10/RF-24); antes veía el historial completo de otros | Dejar el historial sin filtrar |
| 2026-10-19 | **Usuarios inactivos bloqueados:** `proteger` y `login` rechazan `activo:false` (401) | Desactivar un usuario debe revocar su acceso de inmediato, sin depender de eliminar tokens | Confiar solo en borrar la cuenta o no validar `activo` |
| 2026-10-19 | **Recuperación de contraseña endurecida:** el token se guarda **hasheado (sha256)**, se envía un **enlace** hacia `CLIENT_URL`, se exige `confirmarContrasena` y **nunca se devuelve el token en producción** | Evitar toma de cuenta (el token en texto plano en la BD o en la respuesta HTTP es crítico); `confirmarContrasena` cumple RF-01 | Guardar el token plano y devolverlo en la respuesta cuando no hay SMTP |
| 2026-10-19 | **Validadores en todas las rutas de escritura:** `catalogo`, `configuracion`, `rol` (roles+módulos), `reporte` (fechas), cuentas de recaudo, preguntas, PQR (POST), `PUT /usuarios/:id` (whitelist), `cambiar-rol` y `olvide/restablecer/cambiar-contrasena` | Criterio del usuario: cada ruta valida su entrada; consistencia con la regla #12 y RF-31 (validar tipo de dato al guardar) | Dejar rutas de escritura sin validación de formato |
| 2026-10-19 | **Archivos sensibles en carpetas protegidas:** comprobantes (`comprobantes/`), soporte SENA (`verificacion-sena/`), evidencias (`evidencias/`), soportes PQR (`soportes-pqr/`) y actas (`rechazos/`) se añaden a `CARPETAS_PROTEGIDAS` y se suben con `crearUpload`; se corrige el bug de `evidenciaFoto` (se leía `req.files` en lugar de `req.body`) | RNF-01/privacidad: un carné/cédula o comprobante no debe ser público por `/uploads` | Servir documentos sensibles por la raíz estática de `/uploads` |
| 2026-10-19 | **Notificación del resultado de verificación SENA (RF-02)** con plantillas `verificacion-aprobada`/`verificacion-rechazada` (seed + fallback), y **tipologías RF-04** completas en el seed + `PUT /api/auth/tipologia` | Cerrar los pendientes de Fase 1 (notificar verificación) y RF-04 (selección de tipología por el cliente) | Dejar la verificación sin notificar o la tipología solo editable por el Admin |
| 2026-10-19 | **`app.set('trust proxy', 1)`** en `index.js` | Detrás de Render/Heroku, `req.ip` debe ser la IP real del cliente para el rate-limit y la IP de la firma (RF-13) | Usar `req.ip` directo (sería la IP del proxy) |
| 2026-10-19 | **Archivos en GridFS** (`services/storage.service.js`): `guardar`/`abrirLectura`/`existe`/`eliminar` + middleware `guardarSubida`; `config/multer.js` pasa a **`memoryStorage`**; `pdf.service.js` genera los PDFs **en memoria** y los guarda en GridFS; informes/cotizaciones se descargan por **stream desde GridFS** | El filesystem de Render es **efímero**: los archivos en `uploads/` se pierden en cada deploy. GridFS (MongoDB Atlas) persiste los binarios sin servicio externo (S3/Cloudinary) | Guardar en disco (`uploads/`) o integrar S3/Cloudinary |
| 2026-10-19 | **Paginación opcional** en `crudFactory.listar` y `crudConAuditoria.listar` (`?pagina`/`?limite`, tope 50); sin parámetros se mantiene el comportamiento histórico (devuelve todo) | RNF-04 (respuestas < 2 s) sin romper los consumidores que esperan `total`/`data` sin paginar | Paginar siempre con default, o no paginar |
| 2026-10-19 | **Cron externo con secreto compartido**: `POST /api/cron/retrasos` protegido por `x-cron-secret` (`CRON_SECRET`), sin JWT; lo llama un Render Cron Job. Ejecuta `ejecutarAlertasRetraso` + `drenarCorreosPendientes` | En Render free la app duerme por inactividad y el `node-cron` en proceso no se ejecuta de forma fiable | Confiar solo en `node-cron` (no corre si la app duerme) |
| 2026-10-19 | **Cola de correo persistente**: `Notificacion` gana `para` (destinatario) y `usuario` pasa a opcional; `notificar`/`notificarCorreo` guardan `para`; `drenarCorreosPendientes()` reenvía los correos `Pendiente` perdidos por la cola en memoria (se dispara en el arranque y en el cron externo) | La cola en memoria pierde los correos pendientes al reiniciar (Render); recuperarlos desde MongoDB evita usar Redis/BullMQ | Cola en memoria sin persistencia, o BullMQ+Redis |
| 2026-10-21 | **Cierre de gaps de autorización (matriz §2):** `POST /notificaciones` solo Administrador (`validarNotificacion`), `DELETE /notificaciones/:id` solo Administrador, `GET /rechazos/motivos` solo personal, `POST/PUT /rechazos/motivos` con `validarMotivo`, `PUT /rechazos/:id/decision` sin Analista y `POST /encuestas` sin Analista/Recepcionista | Cada ruta debe reflejar la matriz rol→permiso; antes quedaban escrituras abiertas a roles no autorizados | Dejar `POST /notificaciones` o la decisión de rechazo abiertas a cualquier autenticado |
| 2026-10-21 | **Robustez GridFS:** los streams de descarga escuchan `error` (404 en vez de romper el proceso); en `aceptarCotizacion`, si falla `emitirCupon`/guardado se **elimina la firma huérfana**; `drenarCorreosPendientes` solo drena correos de más de 30 s (anti doble envío) | Evitar `error` sin manejar en streams, huérfanos en GridFS y envíos duplicados en el drenado | Sin manejo de errores en streams, sin limpieza de huérfanos, drenado sin guard de antigüedad |
| 2026-11-03 | **Marca e identidad LABFICAT:** el sistema pasa a identificarse como **LABFICAT** (Laboratorio de Caracterización Fisicoquímica de Alimentos del Centro Agroturístico de San Gil). Los datos institucionales (nombre, descripción, NIT, dirección, correo `labficat@sena.edu.co`, código de formato `CAT-ST-OC-F-002`, responsable, días de entrega y de validez) se guardan como `ParametroSistema` en el seed y se consumen en los PDFs, el endpoint `/` y los encabezados | El formulario real de la oferta identifica al laboratorio con su NIT, dirección y correo institucional; centralizarlo en parámetros permite editarlo sin tocar código | Hardcodear los datos en cada PDF/vista |
| 2026-11-03 | **Catálogo inicial + datos técnicos del ensayo:** el seed siembra la categoría "Fisicoquímico", el tipo "Alimento" y los 5 ensayos de la oferta (Fibra Cruda, Cenizas, Proteína, Grasas, Humedad) con sus **métodos** y **técnicas** reales (AOAC/INTERNO). `Examen` gana `metodo`, `tecnica` y `tercerizado` (el "**" del formulario = ensayo tercerizado) | El formulario lista cada ensayo con su método y técnica; el catálogo salía vacío y sin esas columnas | Cargar el catálogo a mano desde el panel admin sin datos iniciales |
| 2026-11-03 | **Cotización con condiciones LABFICAT:** `Cotizacion` gana `validezOferta` y `entregaResultadosDias`; `detalles[]` gana `metodo`/`tecnica` como **snapshot**. El PDF de cotización se reescribe con el formato "Oferta de servicios" (CAT-ST-OC-F-002): datos del cliente, tabla Ensayo/Método/Técnica/Cantidad/Valor unitario/Costo, Subtotal/Total, condiciones comerciales y bloque de aceptación | El PDF previo era genérico y no reflejaba el formulario oficial; el snapshot técnico mantiene RF-06 (el precio y los datos del ensayo no cambian con el catálogo) | Dejar el PDF genérico o no snapshot-ear método/técnica |
| 2026-11-03 | **Datos del cliente en `Usuario`:** se agregan `razonSocial`, `direccion`, `ciudad`, `departamento`, `cargo`, `personaContacto` y `NIT` como tipo de documento (empresa vs persona natural). Todos opcionales para persona natural | El formulario pide NIT/C.C., dirección, ciudad, departamento, cargo y persona de contacto; el modelo solo tenía documento/correo/teléfono | Ampliar solo para personas naturales sin soportar empresas |
| 2026-11-03 | **Solo se cobra a externos (reafirmado):** se mantiene RF-06/RF-02: cotización con cobro solo para `EXTERNO`; usuario SENA verificado → `$0` y `exonerada: true` (sin cupón ni pago). No se cambia RF-09 (el pago se exige antes de recibir la muestra; el texto "antes del informe" del formulario es solo el plazo máximo) | Regla inviolable #2 y #1; el usuario confirmó mantener la práctica de pago antes de recepción | Cobrar a SENA o permitir pago después de la recepción |
| 2026-11-03 | **Catálogo completo y motivos de rechazo en el seed:** se siembran los **36 ensayos** de la oferta (nombre, método, técnica, unidad y precio) y los **7 motivos de rechazo** del formulario "Recepción de muestras". El seed usa `findOneAndUpdate` con clave `{ nombre, metodo }` para permitir analitos con el mismo nombre y distinto método | Los formularios (`0041-2026V1.xlsx`, `0015-2026.xlsx`) definen el portafolio y los motivos reales; antes el catálogo solo tenía 5 ensayos y los motivos no se sembraban | Dejar el catálogo y los motivos a carga manual del panel admin |
| 2026-11-03 | **Tipologías de cliente = "Clasificación/Tipología" (8):** se reemplazan las 6 tipologías originales (RF-04) por las **8** del formulario de "Clasificación/Tipología" (Desplazados, Comunidad SENA, Emprendedor, Víctimas del Conflicto, Asociaciones, Cooperativas de Aprendices, Cooperativas, Persona natural) | El formulario nuevo cambia la lista de clasificación de clientes | Mantener las 6 tipologías del Borrador 4 |
| 2026-11-03 | **Recepción con datos del formulario CAT-ST-MI-F-002:** `Muestra` gana `municipioRecoleccion`, `direccionTomaMuestra`, `lugarTomaMuestra`, `recolectadaPor`, `procedimientoMuestreo`, `matrizMuestra`, `fechaHoraRecoleccion`, `cotizacion` (ref, la fija el servidor desde la solicitud) e `itemCotizacion`; el formulario de recepción (`RecepcionPage.vue`) los captura | El acta de recepción real registra esos metadatos; el modelo no los guardaba | Guardar solo los datos de entrega (cantidad/empaque/temperatura) |

---

## 8. Estado por fases

> Marcar **solo** lo verificado en el código. `[ ]` = pendiente. Fecha y responsable se anotan al completar.

### Fase 0 — Cimientos y seguridad
- [x] Estructura MVC completa (`models`, `controllers`, `routes`, `middlewares`, `validators`, `utils`, `config`).
- [x] Conexión a MongoDB Atlas (`src/config/db.js`).
- [x] JWT: generar/verificar (`src/utils/tokens.js`) + middleware `proteger`.
- [x] Hash de contraseñas con `bcryptjs` (auth y usuarios).
- [x] Middleware `autorizar(roles)`.
- [x] Manejo central de errores y 404 (`error.middleware.js`).
- [x] CORS, `express.json`/`urlencoded` (límite `1mb`) y estáticos de `uploads`.
- [x] `helmet` (cabeceras de seguridad) y `express-rate-limit` en `/api/auth` (2026-10-08).
- [x] Multer (JPG/PNG/PDF, máx. 5 MB).
- [x] Whitelist de campos en `crudFactory` (`src/constants/camposPermitidos.js`) (2026-10-08).
- [x] Transiciones de estado validadas + 409 (`estados.js`, `transicion.middleware.js`) (2026-10-08).
- [x] Propiedad de registros para el Cliente (`propietario.middleware.js`) (2026-10-08).
- [x] Migración a **ES Modules** (`"type": "module"`): 87 archivos convertidos, sin restos de
  `require`/`module.exports` en el código propio, `node --check` 87/87, grafo de rutas cargando,
  arranque real y API respondiendo (2026-10-09).
- [ ] Rotación de credenciales de Atlas (ver sección 9).
- [ ] 3 vulnerabilidades `high` de `npm audit` **aceptadas y documentadas**: solo desarrollo
      (`nodemon→chokidar→braces`), no llegan a producción (2026-10-08).

### Fase 1 — Usuarios / SENA / tipología
- [x] Modelos `Usuario`, `Rol`, `Modulo`, `TipologiaCliente`, `VerificacionSena`.
- [x] Registro, login, perfil, cambio de contraseña, recuperación/restablecimiento.
- [x] CRUD de usuarios + aprobar/rechazar verificación SENA.
- [x] Seed de módulos, roles, tipologías y admin.
- [x] Endurecer `POST /api/usuarios` (ahora solo Administrador) y `PUT /api/usuarios/:id` (2026-10-08).
- [x] No aceptar `rol`/`tipoUsuario` desde el body; registro público nace `Cliente`/`EXTERNO` (2026-10-08).
- [x] Usuario multirrol (`roles[]` + `rol` activo) con `POST /api/auth/cambiar-rol` (2026-10-08).
- [x] Verificación SENA **solo con correo `@sena.edu.co`**: validador + `match` en el modelo + bloqueo
  al aprobar (2026-10-09, `constants/sena.js`).
- [x] Notificar el resultado de la verificación SENA (2026-10-19, plantillas `verificacion-aprobada`/`verificacion-rechazada`).

### Fase 2 — Catálogo y pre-solicitud
- [x] Modelos `CategoriaAnalisis`, `TipoMuestra`, `Examen`.
- [x] CRUD de catálogo (escritura solo administrador; lectura ahora **pública**).
- [x] Modelo `Solicitud` con `codigoPresolicitud` y `autorizacion` embebida; endpoint de creación.
- [x] Catálogo público sin login (RF-05) con `q`, `categoria`, `tipoMuestra`, paginación y orden (2026-10-09).
- [x] Sugerencia automática de batería de exámenes (RF-16): motor de reglas + punto de extensión IA (2026-10-09).
- [x] Pre-solicitud con `examenes[]` opcionales y **snapshot de precio**; respuesta con `codigoPresolicitud` + `sugerencias` (2026-10-09).
- [x] Código de pre-solicitud/cotización/cupón consecutivo y atómico (2026-10-08, `services/codigos.service.js`).

### Fase 3 — Cotización / firma / cupón
- [x] Modelo `Cotizacion` con `detalles[]` embebidos.
- [x] Endpoint de creación de cotización y de cupón (`CUP-`) (ahora con cálculo en servidor).
- [x] Cálculo de precios y snapshot por examen (2026-10-09, `services/cotizacion.service.js`): precios del catálogo vigente.
- [x] Forzar `$0`/`exonerada` para usuario SENA **verificado** (`tipoUsuario === 'SENA'` o `VerificacionSena` aprobada) (2026-10-09).
- [x] Generar PDF de la cotización (2026-10-09, `pdfkit` → `uploads/cotizaciones/`, descarga solo dueño/admin).
- [x] Endpoint de aceptar + firma digital (RF-13) (2026-10-09): firma `base64` → `uploads/firmas/`, términos, nombre/documento, fecha/hora e IP en `Solicitud.autorizacion`.
- [x] Cupón solo si `valor > 0`, con cuentas activas vigentes, fecha desde `ParametroSistema` y un solo cupón por cotización (2026-10-09, `services/cupones.service.js`).

### Fase 4 — Pagos
- [x] Modelos `CuentaRecaudo`, `CuponPago`, `Pago`.
- [x] Carga de comprobante (multer) y verificación aprobar/rechazar (preliminar).
- [x] Restringir listado/consulta a dueño o rol autorizado (2026-10-08).
- [x] Validar estado previo `Pendiente de verificación` y exigir observación al rechazar (2026-10-08).
- [x] **Registrar pago** con validación completa (2026-10-09): método (consignación, transferencia,
  efectivo), comprobante obligatorio salvo efectivo (allí `numeroReciboCaja`), `fechaPagoReportada`,
  `valorReportado`, estado inicial `Pendiente de verificación` fijado por el servidor y
  **cupón vencido → 409** (`services/pagos.service.js`, `validators/pago.validators.js`).
- [x] **Verificación** (2026-10-09): solo Admin/Recepcionista y solo desde `Pendiente`; observación
  obligatoria al rechazar; guarda `verificadoPor`/`fechaRevision`; **al aprobar mueve la `Solicitud`
  a `Pagada`** (sostiene RF-09 en recepción).
- [x] **"Mis pagos" con historial** (2026-10-09): `GET /api/pagos/mis-pagos` (solo lo suyo) +
  `Pago.historial[]` visible también en `GET /api/pagos/:id`.
- [x] **Eventos `pagoAprobado` / `pagoRechazado`** (2026-10-09): `services/eventos.service.js`;
  al aprobar envía las **instrucciones de muestra** del `Examen` (cantidad, envase, temperatura,
  tiempo máximo de traslado, RF-12); al rechazar notifica con el motivo (RF-09/RF-33).
- [x] **Bandeja de pendientes** (2026-10-09): `GET /api/pagos/pendientes`, solo Admin/Recepcionista,
  ordenada por antigüedad (`fechaCarga` asc) y paginada.
- [ ] Reintentar un pago rechazado enlazando el registro anterior (hoy se crea un pago nuevo).

### Fase 5 — Recepción / turnos / rechazo / rótulos
- [x] Modelo `Muestra` + creación (código `A1/A2-AAAA-NNNN`).
- [x] Modelos `MotivoRechazo` y `Rechazo` + CRUD.
- [x] Verificar pago aprobado antes de recibir (RF-09) (2026-10-09): `crearMuestra` exige que la solicitud esté `Pagada` (o exonerada) → **409**.
- [x] Código `A1/A2-AAAA-NNNN` consecutivo y atómico (2026-10-08).
- [x] **Búsqueda por código de pre-solicitud** (2026-10-09): `GET /muestras/buscar` devuelve
  `aptaRecepcion` (solo solicitud `Pagada`), los análisis con sus parámetros y las muestras
  existentes (RF-17).
- [x] **Turnos y cola** (2026-10-09, RF-19, RNF-08): `numeroTurno` diario atómico
  (`services/turnos.service.js`, serie `TURNO-AAAA-MM-DD` sobre `Contador`) y
  `GET /muestras/cola` ordenado **A1 antes que A2 y luego por llegada**, con `enAtencion`.
- [x] **Ingreso** (2026-10-09, RF-17): `estadoInicial` `Aceptada` (default) o `En observación`;
  `temperaturaRecepcion` obligatoria si el examen tiene `requiereTemperatura` (400);
  `examenes[]` copiados de la cotización; solicitud → `En proceso`; historial con acción
  `Recepción`; validadores nuevos (`muestra.validators.js`, `rechazo.validators.js`).
- [x] **Rechazo** (2026-10-09, RF-20): `services/rechazos.service.js` — motivo del catálogo
  obligatorio (400 sin él), evidencia opcional, **acta PDF generada por el servidor**
  (`uploads/rechazos/`), muestra → `Rechazada` + etapa `Cancelada` (nueva, terminal),
  historial con acción `Rechazo`, evento `muestraRechazada` → notificación al cliente con la
  decisión **Reenviar/Recoger** (`PUT /rechazos/:id/decision`); `GET/PUT /rechazos` acotados
  según la matriz §2.
- [x] **Rótulos 58/80 mm** (2026-10-09, RF-21): `GET /muestras/:id/rotulo?ancho=58|80` en HTML
  imprimible (CSS `@page`) con código, parámetros y fecha, **sin datos del cliente** (RF-22).

### Fase 6 — Trazabilidad / código ciego / auditoría
- [x] Modelo `HistorialMuestra`; `cambiarEtapa` registra movimiento (lógica en `services/muestras.service.js`).
- [x] Enum de acción incluye `Consulta datos cliente` (RF-29).
- [x] Validar transiciones de etapa (RF-23) (2026-10-08).
- [x] Justificación obligatoria al pasar a Re-ensayo (RF-23) (2026-10-09): sin `justificacion` → **400**;
  se guarda como comentario en el historial.
- [x] Inmutabilidad de historial (RF-24) (2026-10-08); hooks ampliados con `findOneAndReplace` (2026-10-09).
- [x] Código ciego / enmascarar identidad para el Analista (RF-22, RNF-01) (2026-10-09): DTO técnico en
  `services/blindaje.service.js` (solo código, parámetros y estado; nunca `solicitud`/`usuario`/`entregadoPor`/
  `observaciones`); `listar`/`obtener`/`cambiar-etapa`/`cola` sin poblar `solicitud`; **hoja de trabajo A4
  anónima** en `GET /muestras/:id/hoja-trabajo`.
- [x] Des-anonimización con contraseña + motivo auditado (RF-29) (2026-10-09): `PUT /muestras/:id/datos-cliente`
  (Administrador y Recepcionista), reautentica con `bcrypt` (401) y registra `Consulta datos cliente`.
- [x] Asignación / reasignación / reapertura con motivo (RF-28) (2026-10-09): `PUT /muestras/:id/asignar` y
  `PUT /muestras/:id/reabrir` (solo Administrador, motivo obligatorio, notifica al analista); reapertura solo
  desde `Finalizada`; `porcentajeAvance` virtual y notificación al cliente en los hitos
  Resultados/Validación/Finalizada/Re-ensayo.

### Fase 7 — Informe / encuesta / cierre / PQR
- [x] Modelo `Informe` + CRUD + subida de PDF.
- [x] Modelos `PreguntaEncuesta`, `Encuesta` e `Inconformidad` + CRUD.
- [x] Bloqueo de descarga del informe hasta encuesta 100% (RF-26) (2026-10-09): `GET /informes/:id/pdf`
  es un **stream autenticado** (Admin + Cliente dueño), con el PDF en `uploads/informes/` (carpeta
  protegida, nunca por `/uploads`); sin informe `Aprobado` → 409 y sin encuesta completa → **403
  `ENCUESTA_PENDIENTE`** (aunque se conozca la URL).
- [x] Validar completitud de la encuesta (2026-10-09): `services/encuestas.service.js` exige **todas las
  preguntas activas** en escala **1-5** (incompleta o fuera de rango → 400), evita duplicado (409) y marca
  `completa: true`.
- [x] Notificación de cierre (RF-15) (2026-10-09): cierre **automático** vía `services/cierre.service.js`
  (informe `Aprobado` + encuesta completa) → solicitud `Finalizada` + `fechaCierre` y evento
  `solicitudCerrada` (App + correo).
- [x] Informe PDF validado/firmado por Jefe de Laboratorio (RF-25) (2026-10-09): `POST /informes`
  (solo Administrador, nace `En revisión`) y `PUT /informes/:id/aprobar` (`En revisión → Aprobado`, fija
  `revisadoPor`/`fechaValidacion`).
- [x] PQR (RF-31) (2026-10-09): máquina `Abierta → En revisión → Resuelta → Cerrada` (+ reapertura) en
  `constants/estados.js` y `services/inconformidades.service.js` (respuesta obligatoria al resolver,
  `fechaResolucion` automática y notificación al usuario).

### Fase 8 — Notificaciones / plantillas / cron / IA
- [x] Modelos `Notificacion`, `PlantillaMensaje`, `OpcionAsistenteIA`, `ParametroSistema`.
- [x] CRUD de notificaciones y de configuración.
- [x] Util `mailer` (Nodemailer opcional) usado en recuperación de contraseña.
- [x] Motor de variables en plantillas (RF-14) (2026-10-09): `PlantillaMensaje` gana **`codigo`** único;
  `services/plantillas.service.js` (`renderPlantilla`) reemplaza `{{nombre}}`, `{{orden}}`, `{{estado}}`,
  `{{fecha}}`, etc. **sin caché** (la plantilla se lee en cada envío ⇒ editarla cambia el siguiente mensaje).
- [x] Notificaciones multicanal asíncronas (RNF-09) (2026-10-09): **servicio único** `notificar()` (App +
  correo) que reemplaza las notificaciones sueltas de fases anteriores; `services/colaNotificaciones.service.js`
  envío asíncrono con **reintentos** y registro del resultado (`estado`/`intentos`/`error` en `Notificacion`).
- [x] Cron de alertas de retraso (RF-32) (2026-10-09): `node-cron` + `services/cron.service.js`; detecta
  muestras y cupones sin avance por más de `diasAlertaRetraso` (excluye canceladas/rechazadas), alerta al
  correo de producción de centros y al cliente, y **no repite** (marca `ultimaAlertaRetraso`).
- [x] Asistente IA / chat (RF-11) (2026-10-09): `POST /api/asistente/chat` con `services/asistente.service.js`;
  contexto limitado a catálogo + parámetros, `OpcionAsistenteIA` como prompts, historial persistido
  (`MensajeAsistente`) y clave **solo** en `.env` (`IA_API_KEY`/`IA_URL`/`IA_MODELO`).

### Fase 9 — Panel / reportes / configuración / pruebas
- [x] CRUD de configuración (plantillas, IA, parámetros, tipologías).
- [x] `BACKEND/API_TEST.http` con pruebas manuales base.
- [x] Endpoints de reportes exportables (RF-30) (2026-10-09): `GET /api/reportes?desde&hasta&formato=json|csv|xlsx|pdf`
  (solo Administrador) con volumen de muestras, % rechazadas, facturado a externos y exonerado SENA;
  exportadores en `services/export.service.js` (CSV, Excel con `exceljs`, PDF con `pdfkit`).
- [x] Dashboard del Jefe de Laboratorio (RF-27) (2026-10-09): `GET /api/reportes/dashboard`
  (Administrador y Recepcionista) con muestras por etapa, cola A1/A2, pagos pendientes, alertas y recaudo.
- [x] Configuración con auditoría (RF-27/RF-31) (2026-10-09): modelo `AuditoriaConfiguracion` +
  `utils/crudConAuditoria.js` en plantillas/prompts IA/parámetros/tipologías/catálogo (precios)/roles/cuentas
  de recaudo; `GET /api/configuracion/auditoria`. Los precios se guardan como snapshot en la cotización.
- [x] Pruebas automatizadas (2026-10-09): **`pruebas/flujo.integracion.test.js`** con **supertest** +
  **mongodb-memory-server** (`npm test`) recorre el flujo completo de registro a cierre en una sola prueba;
  verificaciones manuales por función en `BACKEND/verificacion/` (`npm run verificacion`).
- [x] Índices de Mongo revisados (2026-10-09): `Muestra`, `Pago`, `Notificacion`, `HistorialMuestra`,
  `Informe`, `Solicitud`, `CuponPago` y `AuditoriaConfiguracion`.
- [ ] Corrección de las 3 vulnerabilidades `high` de dev (aceptadas y documentadas).

---

## 9. Brechas conocidas hoy

> Verificadas contra el código (última revisión: **2026-10-19**). Si una ya no aplica, corregir aquí
> y registrar en bitácora.

1. **Cotización: resuelto (2026-10-09).** `calcularCotizacion` (`services/cotizacion.service.js`)
   toma precios **vigentes** del catálogo y los guarda como snapshot en `detalles[]`; `valorTotal`,
   `exonerada` y `detalles` ya **no** se aceptan desde `req.body` (whitelist). El PDF se genera con
   `pdfkit` (`uploads/cotizaciones/`) y solo se descarga por `GET /cotizaciones/:id/pdf` (el acceso
   estático a esa carpeta responde 403). Sigue **pendiente**: enviar la cotización por correo.
2. **Pagos: resuelto (2026-10-09).** Además de la propiedad (`alcances.pago`) y de la transición
   (`Pendiente de verificación → Pagado|Rechazado`) con `observacion` obligatoria al rechazar:
   registro validado (comprobante salvo efectivo, cupón vigente y propio), historial en
   `Pago.historial[]`, **eventos `pagoAprobado`/`pagoRechazado` con notificación App + correo**
   (RF-12 instrucciones de muestra), la **`Solicitud` pasa a `Pagada` al aprobar** y existe la
   bandeja `GET /pagos/pendientes`. Sigue **pendiente**: enlazar el reintento de un pago rechazado
   con el registro anterior y usar plantillas con variables (RF-14).
3. **Muestra: transiciones, RF-09 y turnos resueltos (2026-10-09).** `cambiarEtapa` y
   `PUT /muestras/:id` validan `estado`/`etapaActual` (inválida → 409); código
   `A1/A2-AAAA-NNNN` + `prioridad`; `crearMuestra` exige que la solicitud esté **`Pagada`**
   (409 si no); y el **motor de `numeroTurno` quedó resuelto**: secuencia diaria atómica
   (`TURNO-AAAA-MM-DD`) + cola `GET /muestras/cola` (A1 → A2 → llegada). *Fase 6 (2026-10-09):* el
   `PUT /muestras/:id` genérico pasó a **Admin/Recepcionista** y el cambio de etapa ya exige
   justificación en `Re-ensayo`. Sigue **pendiente**: afinar el **actor por transición** de la matriz
   §3.4 de `REGLAS_NEGOCIO.md` (hoy la máquina valida el salto, no quién lo hace).
4. **HistorialMuestra (RF-24): resuelto (2026-10-08).** El controlador es solo-lectura
   (`listar`/`obtener`) y el modelo bloquea `update`/`delete` con hooks; solo se permite crear desde
   la capa interna.
5. **Código ciego (RF-22/RNF-01): resuelto (2026-10-09) y ampliado (2026-10-19).** `services/blindaje.service.js` aplica un
   **DTO técnico** a todas las respuestas del rol Analista (listar, detalle, cambio de etapa y cola): solo
   código, prioridad, turno, estado/etapa/avance, parámetros y resultado de los exámenes, temperatura y
   fechas; **jamás** `solicitud`/`usuario`/`entregadoPor`/`observaciones`, y en sus consultas no se popula
   `solicitud`. Incluye **hoja de trabajo A4 anónima** (`GET /muestras/:id/hoja-trabajo`) y `PUT /muestras/:id`
   genérico restringido a Admin/Recepcionista. *2026-10-19:* el Analista también queda **excluido de
   solicitudes, cotizaciones (listar/obtener/PDF) y pagos** (expone identidad del cliente). Sigue
   **pendiente** decidir si el Analista debe ver el **listado** de informes y encuestas.
6. **Informe/encuesta/PQR: resuelto (2026-10-09).** `services/informes.service.js` (subida del PDF a
   `uploads/informes/` —protegida—, aprobación del Administrador y **descarga por stream autenticado**),
   `services/encuestas.service.js` (escala 1-5, todas las preguntas obligatorias, `completa`) y
   `services/cierre.service.js` (cierre automático con informe `Aprobado` + encuesta completa). La
   descarga del informe responde **403 `ENCUESTA_PENDIENTE`** sin encuesta, incluso conociendo la URL.
   PQR: `services/inconformidades.service.js` con máquina de estados y `fechaResolucion`.
7. **Rechazo: resuelto (2026-10-09).** `services/rechazos.service.js` reemplazó al CRUD plano:
   motivo del catálogo **obligatorio** (400 sin él), acta PDF **generada por el servidor**,
   muestra → `Rechazada` + etapa `Cancelada`, historial con acción `Rechazo` y notificación al
   cliente con la decisión Reenviar/Recoger (`PUT /rechazos/:id/decision`). Sigue **pendiente**:
   que el cliente pueda **consultar** sus rechazos con propiedad (hoy `GET /rechazos` es solo
   del personal).
8. **No existen:** cron RF-32, reportes RF-30, asistente IA RF-11, motor de variables
   de plantillas RF-14. *Resuelto (2026-10-09):* **rótulos RF-21** —
   `GET /muestras/:id/rotulo?ancho=58|80` en HTML imprimible con código, parámetros y fecha,
   sin datos del cliente.
   *Resuelto (2026-10-09):* **firma digital RF-13** — `POST /cotizaciones/:id/aceptar` exige
   `firmaImagen` (base64), `aceptaTerminos`, nombre y documento, y guarda fecha/hora e **IP** en
   `Solicitud.autorizacion` (antes solo existía el modelo, sin lógica).
   *Resuelto (2026-10-09):* **des-anonimización RF-29** — `PUT /muestras/:id/datos-cliente`
   (Admin/Recepcionista) exige contraseña (401) y motivo (400), devuelve los datos del cliente y
   audita `Consulta datos cliente` en `HistorialMuestra`.
   *Resuelto (2026-10-09):* **asignación/reasignación/reapertura RF-28** — `PUT /muestras/:id/asignar`
   y `PUT /muestras/:id/reabrir` (solo Admin, motivo obligatorio, notifica al analista).
   *Resuelto (2026-10-09):* **informe/encuesta/cierre/PQR RF-25/RF-26/RF-31** — informe aprobado por el
   Admin con descarga protegida, encuesta 1-5 obligatoria, cierre automático de la solicitud y flujo de
   estados de la PQR con fecha de resolución. *Resuelto (2026-10-19):* **archivos sensibles protegidos** —
   comprobantes, soporte SENA, evidencias y soportes PQR pasan a subcarpetas de `CARPETAS_PROTEGIDAS`
   (`comprobantes/`, `verificacion-sena/`, `evidencias/`, `soportes-pqr/`, más `rechazos/` para las actas);
   ya **no** se sirven por `/uploads`. *Resuelto (2026-10-19):* **almacenamiento persistente** — todos los
   binarios (comprobantes, soportes, evidencias, informes, cotizaciones, actas y firmas) pasan a **GridFS
   en MongoDB Atlas** (`services/storage.service.js`); así sobreviven a los deploys de Render, cuyo
   filesystem es efímero.
   *Resuelto (2026-10-09):* **notificaciones/plantillas/cron/IA RF-14/RF-32/RF-11/RNF-09** — servicio único
   de notificación con plantillas por `codigo` (sin caché), cola asíncrona con reintentos y resultado,
   cron `node-cron` de alertas de retraso sin repetición y asistente IA acotado al catálogo con clave en
   `.env`. Sigue **pendiente:** reportes RF-30, dashboard RF-27 y pruebas automatizadas (Fase 9).
9. **Whitelist `crudFactory`: resuelto (2026-10-08).** `crear`/`actualizar` pasan por `sanitizarBody`
   (`src/constants/camposPermitidos.js`): descarta `rol`, códigos y valores de servidor; el estado
   solo entra si un middleware de transición lo autoriza.
10. **Seguridad de datos:** se reporta que el `BACKEND/.env` con credenciales de Atlas fue compartido;
    **hay que rotar la contraseña del usuario de la base de datos** (no verificable sin leer el `.env`,
    prohibido). Estado de `npm audit`: **0** vulnerabilidades en producción; **3 `high`** en desarrollo
    (`nodemon → chokidar → braces`) **aceptadas y documentadas** (no llegan a producción, 2026-10-08).
11. **Permisos: endurecido (2026-10-08) y ampliado (2026-10-19).** `GET/POST/PUT/DELETE /api/usuarios` solo Administrador;
    propiedad por dueño en solicitudes, cotizaciones, cupones, pagos, muestras, informes, encuestas,
    notificaciones e inconformidades. *2026-10-19:* el **Analista** queda fuera de solicitudes, cotizaciones
    y pagos (código ciego completo) y `GET /muestras/historial` filtra por dueño (nuevo `alcances.historial`).
    Sigue **pendiente**: afinar la matriz §2 de `REGLAS_NEGOCIO.md` frente a la implementación real.
12. **Exoneración SENA: cerrado el vector de registro (2026-10-08) y ampliado el criterio
    (2026-10-09).** El registro público fija `tipoUsuario = 'EXTERNO'` y `rol = Cliente`; ambos están
    fuera del body (whitelist). `esSenaExonerado` ahora acepta `tipoUsuario === 'SENA'` **o**
    `VerificacionSena.estado === 'Aprobada'`, por lo que la exoneración y el prefijo **A1** ya no
    dependen de editar `tipoUsuario` a mano. Sigue **pendiente** promover `tipoUsuario` a `'SENA'`
    al aprobar la verificación (hoy es redundante, pero mantiene coherente el dato).

---

## 10. Protocolo de sesión

1. **Al empezar:** leer esta memoria, identificar la **fase activa** (sección 8) y confirmar en **una
   línea** qué se va a hacer.
2. **Durante:** si algo contradice una **regla inviolable** (sección 5), **detenerse y preguntar**; no
   improvisar.
3. **Al terminar:**
   - actualizar el checklist (sección 8),
   - añadir la entrada en `DOCUMENTACION/BITACORA.md`,
   - registrar decisiones nuevas (sección 7),
   - agregar o ajustar casos en `BACKEND/API_TEST.http`.
4. **Nunca borrar entradas históricas** (memoria, ADR ni bitácora).

---

## 11. Bitácora

El historial cronológico de trabajo **no** vive aquí: está en
[`DOCUMENTACION/BITACORA.md`](./BITACORA.md).
