# AGENTS.md — Sistema de Gestión del Laboratorio (SENA / LABFICAT)

Backend académico del laboratorio LABFICAT: Node.js + Express + MongoDB Atlas (Mongoose),
arquitectura MVC, ES Modules. Frontend Vue 3 + Quasar + Vite + Pinia. Cubre registro,
catálogo, pre-solicitud, cotización, pago manual verificado, recepción y trazabilidad de
muestras, informes, encuestas, PQR y administración.

## Orden obligatoria antes de cualquier cambio

**Lee `DOCUMENTACION/MEMORIA_PROYECTO.md` antes de tocar el proyecto** (también se carga
solo, vía `instructions` en `opencode.json`). Si algo contradice una regla inviolable,
detente y pregunta; no improvises. Las decisiones nuevas van al ADR (sección 7) y cada
sesión se registra en `DOCUMENTACION/BITACORA.md`.

Si el cambio toca `FRONTEND/`, lee antes `DOCUMENTACION/ARQUITECTURA_FRONTEND.md`
(responsabilidad por carpeta, recetario para agregar módulos y checklist de cierre).

## Estructura (no es monorepo)

- Sin manifiesto en la raíz: cada paquete tiene su `package.json`/`node_modules` y los
  comandos se ejecutan **dentro de su carpeta**. No hay CI, ni lint, ni typecheck.
- `BACKEND/` — Express + Mongoose, ESM. Punto de entrada único `BACKEND/index.js`
  (carga `.env`, Express, MongoDB, arranque y seed con `--seed`).
- `FRONTEND/` — Vue 3 + Quasar + Vite. **Ojo:** hasta 2026-11-16 la carpeta se llamaba
  `FRONTEN` (falta la D); los docs históricos aún la nombran así.
- `BACKEND/public/` — copia del build del frontend (`FRONTEND/dist` → `public`); el
  backend la sirve en `/` con fallback SPA. **Queda desfasada si no se recopia tras cada
  `npm run build`.**
- `estructura_frontend/` — plantilla de referencia del diseño; **no es una app ejecutable**.
- `FRONTEND/dist/` — build commiteado; se regenera con `npm run build`.
- `DOCUMENTACION/` — memoria, bitácora, reglas de negocio, arquitectura del frontend.

## Comandos exactos

**Backend** (`cd BACKEND`):

- `npm run dev` — nodemon en `:3000` · `npm start` — node.
- `npm run seed` — idempotente (upsert); además **migra los roles viejos
  (Recepcionista/Analista) a Administrador**. `BACKEND/README.md` aún dice 4 roles:
  está desactualizado; hoy solo existen **Administrador** y **Cliente**.
- `npm test` — `node:test` + supertest + `mongodb-memory-server` (la primera ejecución
  descarga un binario de mongod: requiere red). Prueba individual:
  `node --test pruebas/flujo.integracion.test.js`.
- `npm run verificacion` — 5 scripts sin base de datos; salen con código 1 si algo falla.

**Frontend** (`cd FRONTEND`):

- `npm run dev` — Vite en `:5173` · `npm run build` — **puerta de verificación
  obligatoria** tras cualquier cambio de frontend. No existen pruebas.
- Después de cada build: **copiar el resultado al backend** para que se sirva en `/`:
  `rm -rf BACKEND/public && cp -r FRONTEND/dist BACKEND/public` (o
  `Remove-Item/ Copy-Item -Recurse` en PowerShell).

**Entorno:**

- Copia `.env.example` → `.env` en cada paquete (`MONGODB_URI` obligatoria en el backend;
  `VITE_API_URL` en el frontend). Reiniciar `npm run dev` tras tocar un `.env`.
- `BACKEND/API_TEST.http` apunta a `http://localhost:3000/api` (extensión REST Client).
- Si `Move-Item`/rename de `FRONTEND/` falla por archivo en uso, primero detén el Vite
  (`npm run dev`) que corre dentro de esa carpeta.

## Reglas inviolables (una línea cada una)

1. Sin pago aprobado o exoneración no se recibe ni procesa la muestra (RF-09).
2. Solo el SENA verificado obtiene cotización $0 y prefijo A1 (RF-02, RF-06, RF-18).
3. Los códigos son consecutivos y atómicos (`A1/A2-AAAA-NNNN`), nunca aleatorios (RF-18).
4. `HistorialMuestra` es inmutable: sin update ni delete (RF-24).
5. El Analista nunca recibe datos del cliente: código ciego (RF-22, RNF-01).
6. Des-anonimizar exige contraseña y motivo, y queda auditado (RF-29).
7. Rechazar un pago exige observación; rechazar una muestra exige motivo parametrizado (RF-09, RF-20).
8. Re-ensayo exige justificación (RF-23).
9. El informe no se descarga sin encuesta completa al 100% (RF-26).
10. El Cliente solo accede a sus propios registros.
11. La cotización guarda el precio como snapshot.
12. El rol y el estado nunca se aceptan desde `req.body`.

## Convenciones que no son obvias

**Backend:**

- Lógica de negocio en `src/services/`; controladores delgados.
- Whitelist del body en `src/constants/camposPermitidos.js`; máquinas de estado en
  `src/constants/estados.js` (transición inválida → **409**).
- ESM: imports relativos **siempre con extensión `.js`**; `export default` en
  modelos/rutas/middlewares de un solo valor, `export` nombrado en services/controllers.
- Las carpetas sensibles de `uploads/` (`cotizaciones`, `firmas`, `informes`,
  `comprobantes`, `verificacion-sena`, `evidencias`, `soportes-pqr`, `rechazos`) **nunca**
  se sirven estáticamente: solo por sus endpoints autorizados.

**Frontend:**

- Ninguna vista/store importa `axios`: solo `get/post/put/del` de `services/api.service.js`.
- Alias `@` (nunca `../../../`); avisos con `useNotificar`/`useConfirmar`
  (prohibido `alert/confirm/prompt`); `utils/` es puro; `components/` no toca el backend.

**Orden de confianza:** si un doc contradice el código, manda el código (los docs
arrastran deuda: p. ej. los roles del seed en `BACKEND/README.md`).

## Protocolo de sesión

- **Al empezar:** leer la memoria, identificar la fase activa y confirmar en una línea qué se hará.
- **Durante:** ante conflicto con una regla inviolable, detenerse y preguntar.
- **Al terminar:** actualizar checklist (sección 8), añadir entrada a `DOCUMENTACION/BITACORA.md`,
  registrar decisiones nuevas (sección 7) y ajustar casos en `BACKEND/API_TEST.http`.
- **Nunca borrar entradas históricas** (bitácora, ADR ni memoria).

## Límites

- No tocar `BACKEND/src` sin actualizar la memoria/bitácora.
- No leer ni imprimir `BACKEND/.env`. Sin credenciales en el código.
- Bitácora completa en `DOCUMENTACION/BITACORA.md` (no incluirla en `instructions`).
