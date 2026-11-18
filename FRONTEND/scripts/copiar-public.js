/**
 * @fileoverview /scripts/copiar-public.js
 * Pasos tras `npm run build`: copia FRONTEND/dist -> BACKEND/public.
 *
 * ¿Por qué existe? El backend sirve la SPA desde `BACKEND/public`
 * (`index.js` monta `express.static(public)` antes de `/api`), y Render
 * NO compila el frontend: despliega lo que esté commiteado en esa carpeta.
 * Si la copia se olvida, el deploy queda con un bundle viejo (fue justo la
 * causa de que producción apuntara a `http://localhost:3000/api`).
 *
 * Se hace con Node (`fs.rmSync` + `fs.cpSync`) en lugar de `rm -rf`/`cp -r`
 * para que funcione igual en Windows, macOS y Linux.
 *
 * Lo dispara npm solo: el script `postbuild` de package.json lo ejecuta
 * después de cada `npm run build`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const raizFrontend = path.resolve(__dirname, '..')
const origen = path.join(raizFrontend, 'dist')
const destino = path.resolve(raizFrontend, '..', 'BACKEND', 'public')

if (!fs.existsSync(path.join(origen, 'index.html'))) {
  console.error('❌ No hay FRONTEND/dist/index.html. Ejecuta primero "npm run build".')
  process.exit(1)
}

// Se borra el destino: así los assets con hash viejo no se quedan huérfanos.
fs.rmSync(destino, { recursive: true, force: true })
fs.mkdirSync(destino, { recursive: true })
fs.cpSync(origen, destino, { recursive: true })

const archivos = fs
  .readdirSync(path.join(destino, 'assets'))
  .filter((nombre) => !nombre.startsWith('.')).length
console.log(`📦 FRONTEND/dist copiado a BACKEND/public (${archivos} assets).`)
