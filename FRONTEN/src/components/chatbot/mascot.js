// ============================================================
// Mascota animada del asistente (renderer interno del componente Vue).
// Conserva los estados, tintes y ojos del componente original.
// ============================================================

import mascotaSinOjos from '../../assets/chatbot/mascota-sin-ojos.png'

/** @typedef {'reposo'|'saludo'|'buscar'|'portapapeles'|'pago'|'carnet'|'estado'|'asesor'|'pensar'|'check'|'enojado'|'triste'|'amor'|'sueno'|'sorpresa'|'contento'|'confundido'|'yacasi'|'llamar'|'login'} AnimacionTipo */

const OJOS = [
  {
    key: 'left',
    left: 27.27,
    tilt: 24,
    skinTop: '#2cd149',
    skinBot: '#3fb757',
    skinAvg: '#34c851',
  },
  {
    key: 'right',
    left: 57.02,
    tilt: -24,
    skinTop: '#43e05d',
    skinBot: '#4cc163',
    skinAvg: '#40d35c',
  },
]

const COLORES_CHISPA = ['#39A900', '#7CFC00', '#FDC300', '#ffffff', '#2cd149']

/**
 * Crea el nodo raíz de una mascota animada.
 * @param {AnimacionTipo} animacion
 * @param {number} size
 * @returns {HTMLDivElement}
 */
function crearRaiz(animacion, size) {
  const mascot = document.createElement('div')
  mascot.className = 'mascot'
  mascot.dataset.anim = animacion
  mascot.dataset.size = String(size)
  mascot.style.setProperty('--size', `${size}px`)
  mascot.setAttribute('role', 'img')
  mascot.setAttribute('aria-label', 'Mascota del laboratorio')
  return mascot
}

/**
 * Construye los dos ojos (con párpados y cejas) y devuelve sus nodos móviles.
 * @returns {{ eyes: HTMLDivElement, moves: HTMLDivElement[] }}
 */
function crearOjos() {
  const eyes = document.createElement('div')
  eyes.className = 'mascot-eyes'
  const moves = []

  for (const ojo of OJOS) {
    const eye = document.createElement('div')
    eye.className = `eye eye-${ojo.key}`
    eye.style.setProperty('--eye-left', `${ojo.left}%`)
    eye.style.setProperty('--tilt', `${ojo.tilt}deg`)
    eye.style.setProperty('--tilt-sad', `${ojo.tilt * -0.8}deg`)
    eye.style.setProperty('--skin-top', ojo.skinTop)
    eye.style.setProperty('--skin-bot', ojo.skinBot)
    eye.style.setProperty('--skin-avg', ojo.skinAvg)

    const move = document.createElement('div')
    move.className = 'eye-move'

    const ball = document.createElement('div')
    ball.className = 'eye-ball'

    const white = document.createElement('div')
    white.className = 'eye-white'

    const lidTop = document.createElement('div')
    lidTop.className = 'lid lid-top'

    const lidBottom = document.createElement('div')
    lidBottom.className = 'lid lid-bottom'

    const brow = document.createElement('div')
    brow.className = 'brow'

    ball.append(white, lidTop, lidBottom, brow)
    move.appendChild(ball)
    eye.appendChild(move)
    eyes.appendChild(eye)
    moves.push(move)
  }

  return { eyes, moves }
}

/**
 * Construye la cara común: base, tinte, esfero y ojos.
 * @returns {{ face: HTMLDivElement }}
 */
function crearCara() {
  const face = document.createElement('div')
  face.className = 'mascot-face'

  const img = document.createElement('img')
  img.className = 'mascot-img'
  img.src = mascotaSinOjos
  img.alt = ''
  img.draggable = false

  const tint = document.createElement('div')
  tint.className = 'mascot-tint'
  const tintImg = document.createElement('img')
  tintImg.src = mascotaSinOjos
  tintImg.alt = ''
  tintImg.setAttribute('aria-hidden', 'true')
  tint.appendChild(tintImg)

  const pen = document.createElement('div')
  pen.className = 'mascot-pen'

  const { eyes } = crearOjos()

  face.append(img, tint, pen, eyes)
  return { face }
}

/**
 * Crea el nodo DOM de la mascota animada.
 * @param {AnimacionTipo} [animacion]
 * @param {number} [size]
 * @param {{ seguirCursor?: boolean }} [opciones]
 * @returns {HTMLDivElement}
 */
export function crearMascota(animacion = 'reposo', size = 64, opciones = {}) {
  const mascot = crearRaiz(animacion, size)

  const float = document.createElement('div')
  float.className = 'mascot-float'

  const body = document.createElement('div')
  body.className = 'mascot-body'

  const { face } = crearCara()

  body.appendChild(face)
  float.appendChild(body)
  mascot.appendChild(float)
  mascot.appendChild(crearChispas(size))

  // Todas las mascotas animadas se registran para el parpadeo. La mirada se
  // activa solo si seguirCursor lo permite; las estáticas no se registran.
  const seguirCursor = opciones.seguirCursor ?? size >= SIZE_MINIMO
  registrarMascota(mascot, { seguirCursor })

  return mascot
}

/**
 * @param {number} size
 */
function crearChispas(size) {
  const wrap = document.createElement('div')
  wrap.className = 'mascot-sparks'
  wrap.setAttribute('aria-hidden', 'true')

  for (let i = 0; i < 10; i++) {
    const angulo = (i / 10) * Math.PI * 2 + 0.3
    const distancia = size * (0.62 + (i % 3) * 0.1)
    const chispa = document.createElement('span')
    chispa.className = 'mascot-spark'
    chispa.style.setProperty('--tx', `${Math.cos(angulo) * distancia}px`)
    chispa.style.setProperty('--ty', `${Math.sin(angulo) * distancia}px`)
    chispa.style.background = COLORES_CHISPA[i % COLORES_CHISPA.length]
    chispa.style.animationDelay = `${i * 0.02}s`
    wrap.appendChild(chispa)
  }

  return wrap
}

// ---- Avatares estáticos ----

let avatarBase = null

/**
 * Plantilla interna sin flotación ni chispas. Se clona para cada mensaje.
 * @returns {HTMLDivElement}
 */
function obtenerAvatarBase() {
  if (avatarBase) return avatarBase

  const mascot = crearRaiz('reposo', 28)
  mascot.classList.add('mascot--static')
  mascot.removeAttribute('role')
  mascot.removeAttribute('aria-label')
  mascot.setAttribute('aria-hidden', 'true')

  const body = document.createElement('div')
  body.className = 'mascot-body'
  const { face } = crearCara()
  body.appendChild(face)
  mascot.appendChild(body)

  avatarBase = mascot
  return avatarBase
}

/**
 * Crea un avatar estático que conserva tinte, ojos y expresión del estado.
 * No incluye animaciones, chispas ni flotación.
 * @param {AnimacionTipo} [animacion]
 * @param {number} [size]
 * @returns {HTMLDivElement}
 */
export function crearAvatarEstatico(animacion = 'reposo', size = 28) {
  const mascot = obtenerAvatarBase().cloneNode(true)
  mascot.dataset.anim = animacion
  mascot.dataset.size = String(size)
  mascot.style.setProperty('--size', `${size}px`)
  return mascot
}

/**
 * Cambia el estado de animación de una mascota existente.
 * @param {HTMLElement | null} mascot
 * @param {AnimacionTipo} animacion
 * @param {{ repetir?: boolean }} [opciones]
 */
export function setAnimacion(mascot, animacion, opciones = {}) {
  if (!mascot) return

  if (mascot.dataset.anim === animacion) {
    if (opciones.repetir) reiniciarAnimacionesUnicas(mascot)
    return
  }

  mascot.dataset.anim = animacion
}

/**
 * Reinicia las animaciones CSS de una sola ejecución sin tocar el tinte.
 * @param {HTMLElement} mascot
 */
function reiniciarAnimacionesUnicas(mascot) {
  let hayAnimacionesCSS = false

  for (const animacion of mascot.getAnimations({ subtree: true })) {
    if (typeof CSSAnimation === 'undefined' || !(animacion instanceof CSSAnimation)) continue
    hayAnimacionesCSS = true

    const iterations = animacion.effect?.getComputedTiming?.().iterations
    if (typeof iterations === 'number' && Number.isFinite(iterations)) {
      animacion.cancel()
      animacion.play()
    }
  }

  // Si ya existen animaciones CSS solo infinitas (buscar, pensar, estado…),
  // no hace falta forzar un reflow: se evita trabajo de layout innecesario.
  if (hayAnimacionesCSS) return

  // Respaldo para navegadores sin WAAPI completo: forzar un reinicio breve
  // solo en los elementos animados, manteniendo intacto data-anim y el tinte.
  for (const nodo of mascot.querySelectorAll('.mascot-body, .eye-ball')) {
    const animacionPrevia = nodo.style.animation
    nodo.style.animation = 'none'
    void nodo.offsetWidth
    nodo.style.animation = animacionPrevia
  }
}

// ---- Registro de mascotas animadas ----

/** @type {Map<HTMLElement, { eyeMoves: HTMLElement[], seguirCursor: boolean, visible: boolean }>} */
const mascotasAnimadas = new Map()

/**
 * Registra una mascota animada para mirada y parpadeo.
 * @param {HTMLElement} mascot
 * @param {{ seguirCursor?: boolean }} [opciones]
 */
export function registrarMascota(mascot, opciones = {}) {
  if (!mascot || mascotasAnimadas.has(mascot)) return

  mascotasAnimadas.set(mascot, {
    eyeMoves: Array.from(mascot.querySelectorAll('.eye-move')),
    seguirCursor: opciones.seguirCursor ?? true,
    visible: false,
  })
}

/**
 * @param {HTMLElement | null} mascot
 */
export function desregistrarMascota(mascot) {
  if (mascot) mascotasAnimadas.delete(mascot)
}

// ---- Seguimiento global del cursor ----

const movimientoReducido =
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// En tamaños pequeños (mensajes de 28 px) el desplazamiento no se percibe.
const SIZE_MINIMO = 40
const RANGO_X = 28 // % del ancho del ojo
const RANGO_Y = 20 // % del alto del ojo
const SUAVIZADO = 0.18

/** @type {WeakMap<HTMLElement, {x:number, y:number, tx:number, ty:number}>} */
const estadosMirada = new WeakMap()
let animando = false
let idleTimer = null
let objetivosRAF = null
let ultimoPuntero = { x: 0, y: 0 }

function dibujarMirada() {
  animando = false
  let hayPendiente = false

  for (const [mascot, entrada] of mascotasAnimadas) {
    if (!mascot.isConnected) {
      mascotasAnimadas.delete(mascot)
      continue
    }
    if (!entrada.seguirCursor || !entrada.visible) continue

    let estado = estadosMirada.get(mascot)
    if (!estado) {
      estado = { x: 0, y: 0, tx: 0, ty: 0 }
      estadosMirada.set(mascot, estado)
    }

    const dx = estado.tx - estado.x
    const dy = estado.ty - estado.y

    if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
      estado.x += dx * SUAVIZADO
      estado.y += dy * SUAVIZADO
      hayPendiente = true
    } else {
      estado.x = estado.tx
      estado.y = estado.ty
    }

    for (const move of entrada.eyeMoves) {
      move.style.setProperty('--eye-x', `${estado.x.toFixed(2)}%`)
      move.style.setProperty('--eye-y', `${estado.y.toFixed(2)}%`)
    }
  }

  if (hayPendiente) {
    animando = true
    requestAnimationFrame(dibujarMirada)
  }
}

function asegurarAnimacion() {
  if (animando) return
  animando = true
  requestAnimationFrame(dibujarMirada)
}

function aplicarObjetivos() {
  const mitadAncho = (window.innerWidth || 1) / 2
  const mitadAlto = (window.innerHeight || 1) / 2

  for (const [mascot, entrada] of mascotasAnimadas) {
    if (!mascot.isConnected) {
      mascotasAnimadas.delete(mascot)
      continue
    }
    if (!entrada.seguirCursor) {
      entrada.visible = false
      continue
    }

    // La visibilidad se calcula una vez por frame, no en cada pointermove.
    entrada.visible = mascot.getClientRects().length > 0
    if (!entrada.visible) continue

    const rect = mascot.getBoundingClientRect()
    if (!rect.width) continue

    let dx = (ultimoPuntero.x - (rect.left + rect.width / 2)) / mitadAncho
    let dy = (ultimoPuntero.y - (rect.top + rect.height / 2)) / mitadAlto

    // Limita el vector a un círculo: en diagonal no se sale de la órbita.
    const magnitud = Math.hypot(dx, dy)
    if (magnitud > 1) {
      dx /= magnitud
      dy /= magnitud
    }

    let estado = estadosMirada.get(mascot)
    if (!estado) {
      estado = { x: 0, y: 0, tx: 0, ty: 0 }
      estadosMirada.set(mascot, estado)
    }

    estado.tx = dx * RANGO_X
    estado.ty = dy * RANGO_Y
  }

  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(centrarMirada, 4000)
  asegurarAnimacion()
}

/** @param {PointerEvent} e */
function alMover(e) {
  if (movimientoReducido) return

  ultimoPuntero.x = e.clientX
  ultimoPuntero.y = e.clientY

  // Varios pointermove en el mismo frame se resuelven con una sola lectura
  // de posiciones y un solo recorrido del registro.
  if (objetivosRAF !== null) return
  objetivosRAF = requestAnimationFrame(() => {
    objetivosRAF = null
    aplicarObjetivos()
  })
}

function centrarMirada() {
  if (objetivosRAF !== null) {
    cancelAnimationFrame(objetivosRAF)
    objetivosRAF = null
  }

  if (idleTimer) {
    clearTimeout(idleTimer)
    idleTimer = null
  }

  for (const mascot of mascotasAnimadas.keys()) {
    const estado = estadosMirada.get(mascot)
    if (!estado) continue
    estado.tx = 0
    estado.ty = 0
  }

  asegurarAnimacion()
}

function registrarSeguimiento() {
  if (movimientoReducido) return
  window.addEventListener('pointermove', alMover, { passive: true })
  window.addEventListener('pointerdown', alMover, { passive: true })
  window.addEventListener('pointerleave', centrarMirada, { passive: true })
  window.addEventListener('blur', centrarMirada)
}

// ---- Parpadeo ----

function quitarParpadeo() {
  for (const mascot of mascotasAnimadas.keys()) {
    mascot.classList.remove('mascot-blink')
  }
}

let parpadeoPausado = false
let parpadeoEspera = null
let parpadeoFin = null

/** Cancela el ciclo de parpadeo en curso para no dejar cadenas duplicadas. */
function cancelarParpadeo() {
  if (parpadeoEspera) {
    clearTimeout(parpadeoEspera)
    parpadeoEspera = null
  }
  if (parpadeoFin) {
    clearTimeout(parpadeoFin)
    parpadeoFin = null
  }
}

function programarParpadeo() {
  if (movimientoReducido) return

  // Una sola cadena de parpadeo activa a la vez.
  if (parpadeoEspera || parpadeoFin) return

  // Con la pestaña oculta no se programa trabajo nuevo; se reanuda al volver.
  if (document.hidden) {
    parpadeoPausado = true
    return
  }

  parpadeoPausado = false
  const espera = 4500 + Math.random() * 3500
  parpadeoEspera = setTimeout(() => {
    parpadeoEspera = null
    if (document.hidden) {
      parpadeoPausado = true
      return
    }

    for (const mascot of mascotasAnimadas.keys()) {
      if (mascot.isConnected) mascot.classList.add('mascot-blink')
    }

    parpadeoFin = setTimeout(() => {
      parpadeoFin = null
      quitarParpadeo()
      programarParpadeo()
    }, 150)
  }, espera)
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    parpadeoPausado = true
    cancelarParpadeo()
    quitarParpadeo()
    return
  }

  if (parpadeoPausado) {
    parpadeoPausado = false
    programarParpadeo()
  }
})

registrarSeguimiento()
programarParpadeo()
