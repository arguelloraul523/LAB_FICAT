<template>
  <div class="chatbot-root">
    <!-- Burbuja flotante -->
    <div v-if="!abierto" class="chat-bubble-wrap">
      <div class="chat-tooltip">
        <div class="chat-tooltip-head">
          <span class="tooltip-mascot">
            <ChatbotMascot :animacion="animacion" :size="40" />
          </span>
          <div>
            <p class="chat-tooltip-title">Asistente del Laboratorio</p>
            <p class="chat-tooltip-status"><span class="status-dot" /> En línea</p>
          </div>
        </div>
        <p class="chat-tooltip-text">¡Hola! ¿Dudas sobre exámenes, precios o tu muestra? Te ayudo.</p>
      </div>

      <div class="chat-bubble-row">
        <div v-if="animacion === 'sueno'" class="sleep-bubble" aria-hidden="true">
          <span class="sleep-z sleep-z1">Z</span>
          <span class="sleep-z sleep-z2">z</span>
          <span class="sleep-z sleep-z3">z</span>
        </div>

        <button class="chat-bubble" type="button" aria-label="Abrir el asistente" @click="abrir">
          <span class="mascot-slot">
            <ChatbotMascot :animacion="animacion" :size="72" />
          </span>
          <span class="chat-badge" aria-hidden="true">1</span>
        </button>
      </div>
    </div>

    <!-- Panel -->
    <section v-if="abierto" class="chat-panel" aria-label="Asistente del Laboratorio SENA">
      <header class="chat-head">
        <div class="chat-head-mascot" @click="registrarClic">
          <ChatbotMascot :animacion="animacion" :size="40" />
        </div>
        <div class="chat-head-info">
          <p class="chat-head-title">Asistente del Laboratorio</p>
          <p class="chat-head-sub">SENA · En línea</p>
        </div>
        <button class="head-btn" type="button" title="Minimizar" aria-label="Minimizar" @click="minimizar">
          <span v-html="ICONS.minus" />
        </button>
        <button class="head-btn" type="button" title="Cerrar y limpiar" aria-label="Cerrar y limpiar" @click="cerrar">
          <span v-html="ICONS.close" />
        </button>
      </header>

      <div class="flag-bar" aria-hidden="true">
        <span class="flag-yellow" />
        <span class="flag-green" />
      </div>

      <div class="session-bar" :class="{ 'is-authed': auth.isAuthenticated }">
        <span v-if="auth.isAuthenticated" class="session-line">
          <span class="status-dot" /> Sesión: {{ auth.nombres || auth.correo }} · {{ auth.rol }}
        </span>
        <span v-else>
          Modo visitante ·
          <button class="session-link" type="button" @click="irLogin">inicia sesión</button>
          para ver tu orden
        </span>
      </div>

      <div ref="messagesEl" class="messages" role="log" aria-live="polite" aria-relevant="additions">
        <!-- Mascota viva: una sola instancia que viaja hasta la última respuesta -->
        <div ref="liveHost" class="live-mascot-host" aria-hidden="true">
          <ChatbotMascot :animacion="animacionViva" :size="28" />
        </div>

        <div
          v-for="msg in mensajes"
          :key="msg.id"
          class="msg"
          :class="msg.emisor === 'cliente' ? 'is-user' : 'is-bot'"
        >
          <div
            v-if="msg.emisor === 'asistente'"
            class="msg-avatar"
            :data-viva-slot="!cargando && msg.id === ultimoAsistenteId ? 'true' : null"
          >
            <ChatbotMascot
              v-if="cargando || msg.id !== ultimoAsistenteId"
              :animacion="msg.animacion || 'reposo'"
              :size="28"
              estatico
            />
          </div>
          <div class="msg-bubble">
            <span v-html="formatearTexto(msg.contenido)" />
            <div v-if="msg.opciones?.length" class="options">
              <button
                v-for="op in msg.opciones"
                :key="`${msg.id}-${op.numero}`"
                type="button"
                class="option-btn"
                :class="{ 'is-login': op.accion === 'login' }"
                @click="clickOpcion(op)"
              >
                <span class="option-num">{{ op.numero }}</span>
                <span class="option-text">{{ op.texto }}</span>
                <span class="option-tail" :class="{ 'is-login': op.accion === 'login' }" v-html="iconoOpcion(op.accion)" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="cargando" class="typing" aria-label="El asistente está escribiendo">
          <!-- La mascota viva ocupa este hueco mientras llega la respuesta. -->
          <div class="msg-avatar" data-viva-slot="true" />
          <div class="typing-bubble">
            <div class="typing-dots"><span /><span /><span /></div>
          </div>
        </div>
      </div>

      <form class="composer" autocomplete="off" @submit.prevent="enviar()">
        <div class="composer-row">
          <input
            ref="inputEl"
            v-model="texto"
            class="chat-input"
            type="text"
            maxlength="2000"
            placeholder="Escribe el número o tu pregunta…"
            aria-label="Escribe tu mensaje"
            :disabled="cargando"
          />
          <button class="send-btn" type="submit" aria-label="Enviar mensaje" :disabled="cargando || !texto.trim()">
            <span v-html="ICONS.send" />
          </button>
        </div>
      </form>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from 'src/stores/auth'
import { useChatbotStore } from 'src/stores/chatbot'
import ChatbotMascot from './ChatbotMascot.vue'

const svg = (contenido) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${contenido}</svg>`

const ICONS = {
  send: svg('<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>'),
  close: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  chevron: svg('<path d="m9 18 6-6-6-6"/>'),
  lock: svg('<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
  headphones: svg('<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>'),
  arrowLeft: svg('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>'),
}

const auth = useAuthStore()
const chatbot = useChatbotStore()
const router = useRouter()
const route = useRoute()

const abierto = ref(false)
const mensajes = ref([])
const texto = ref('')
const cargando = ref(false)
const animacion = ref('reposo')
const animacionViva = ref('reposo')
const messagesEl = ref(null)
const inputEl = ref(null)
const liveHost = ref(null)

const ultimoAsistenteId = computed(() => {
  for (let i = mensajes.value.length - 1; i >= 0; i--) {
    if (mensajes.value[i].emisor === 'asistente') return mensajes.value[i].id
  }
  return null
})

// Retorno a reposo por estado (documento de animaciones §7.4).
const TIEMPOS_REPOSO = {
  reposo: 0,
  sueno: 0,
  saludo: 2500,
  buscar: 2500,
  portapapeles: 2500,
  pago: 2500,
  carnet: 2500,
  estado: 2500,
  asesor: 2500,
  pensar: 2500,
  check: 2500,
  enojado: 2500,
  triste: 3000,
  amor: 3500,
  sorpresa: 1200,
  contento: 2500,
  confundido: 1600,
  yacasi: 2500,
  llamar: 2500,
  login: 2200,
}

const ESPERA_SUENO = 180000
const ESPERA_LENTA = 4000
const VENTANA_CLICS = 2500
const DURACION_DESPERTAR = 1200

let saludoEnviado = false
let reposoTimer = null
let reposoVivaTimer = null
let suenoTimer = null
let lentoTimer = null
let saludoTimer = null
let generacion = 0
let despertandoHasta = 0
let clics = []
let vivaColocada = false

function formatearTexto(valor) {
  if (!valor) return ''
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
}

function iconoOpcion(accion) {
  if (accion === 'login') return `${ICONS.lock} Iniciar sesión`
  if (accion === 'asesor') return ICONS.headphones
  if (accion === 'menu') return ICONS.arrowLeft
  return ICONS.chevron
}

function setAnim(valor, { ms } = {}) {
  animacion.value = valor || 'reposo'
  if (reposoTimer) {
    clearTimeout(reposoTimer)
    reposoTimer = null
  }
  const espera = ms ?? TIEMPOS_REPOSO[animacion.value] ?? 2500
  if (espera > 0) {
    reposoTimer = setTimeout(() => {
      reposoTimer = null
      if (!cargando.value) animacion.value = 'reposo'
    }, espera)
  }
  reiniciarSueno()
}

function setAnimViva(valor, { ms } = {}) {
  animacionViva.value = valor || 'reposo'
  if (reposoVivaTimer) {
    clearTimeout(reposoVivaTimer)
    reposoVivaTimer = null
  }
  const espera = ms ?? TIEMPOS_REPOSO[animacionViva.value] ?? 2500
  if (espera > 0) {
    reposoVivaTimer = setTimeout(() => {
      reposoVivaTimer = null
      if (!cargando.value) animacionViva.value = 'reposo'
    }, espera)
  }
}

function reiniciarSueno() {
  if (suenoTimer) clearTimeout(suenoTimer)
  suenoTimer = setTimeout(() => {
    suenoTimer = null
    if (
      !abierto.value &&
      !cargando.value &&
      animacion.value === 'reposo' &&
      animacionViva.value === 'reposo'
    ) {
      animacion.value = 'sueno'
      animacionViva.value = 'sueno'
    }
  }, ESPERA_SUENO)
}

function despertar() {
  despertandoHasta = Date.now() + DURACION_DESPERTAR
  setAnim('sorpresa')
  setAnimViva('sorpresa')
}

/** Actividad del usuario: reinicia el contador y despierta solo desde la mascota. */
function alActivar(evento) {
  if (animacion.value === 'sueno') {
    const objetivo = evento?.target
    const enMascota =
      objetivo instanceof Element && objetivo.closest('.chat-bubble, .chat-head-mascot')
    if (enMascota) {
      despertar()
      return
    }
  }
  reiniciarSueno()
}

/** Suma un clic al huevo de enojo. Devuelve true si se activó. */
function registrarClic() {
  const ahora = Date.now()
  clics = clics.filter((marca) => ahora - marca <= VENTANA_CLICS)
  clics.push(ahora)

  if (clics.length < 5) return false

  clics = []
  setAnim('enojado')
  setAnimViva('enojado')
  return true
}

/**
 * Suma los desplazamientos de layout hasta `ancestro`. Se recorre la cadena de
 * offsetParent porque las animaciones de entrada (`transform` de msg-in) hacen
 * que un `.msg` sea el offsetParent temporal del avatar.
 */
function offsetHasta(nodo, ancestro) {
  let x = 0
  let y = 0
  let actual = nodo

  while (actual && actual !== ancestro) {
    x += actual.offsetLeft
    y += actual.offsetTop
    actual = actual.offsetParent
  }

  return actual === ancestro ? { x, y } : null
}

/** Reposiciona la mascota viva sobre el hueco de la última respuesta. */
function ubicarViva(animar = true) {
  const contenedor = messagesEl.value
  const host = liveHost.value
  if (!contenedor || !host) return

  const hueco = contenedor.querySelector('[data-viva-slot="true"]')
  if (!hueco) {
    host.classList.remove('is-visible')
    return
  }

  // Coordenadas de layout (sin transform) relativas al padding box de .messages.
  let destinoXY = offsetHasta(hueco, contenedor)
  if (!destinoXY) {
    const cajaContenedor = contenedor.getBoundingClientRect()
    const cajaHueco = hueco.getBoundingClientRect()
    destinoXY = {
      x: cajaHueco.left - cajaContenedor.left + contenedor.scrollLeft,
      y: cajaHueco.top - cajaContenedor.top + contenedor.scrollTop,
    }
  }

  const destino = `translate3d(${destinoXY.x}px, ${destinoXY.y}px, 0)`

  if (!animar || !vivaColocada) {
    host.style.transition = 'none'
    host.style.transform = destino
    void host.offsetWidth
    host.style.transition = ''
    vivaColocada = true
  } else {
    host.style.transform = destino
  }

  host.classList.add('is-visible')
}

function irAlFondo() {
  nextTick(() => {
    if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
    ubicarViva()
  })
}

function idMensaje(prefijo) {
  return `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function agregarMensaje(mensaje) {
  mensajes.value.push(mensaje)
  irAlFondo()
}

/** Reacciones locales del frontend con prioridad sobre el backend (§7.9). */
function reaccionLocal(mensaje) {
  if (/gracias|thank/i.test(mensaje)) return 'amor'
  if (!/[0-9a-záéíóúüñ]/i.test(mensaje)) return 'confundido'
  if (mensaje.length >= 120) return 'contento'
  return null
}

function cancelarSaludo() {
  if (saludoTimer) {
    clearTimeout(saludoTimer)
    saludoTimer = null
  }
}

async function enviar(valor, oculto = false) {
  const mensaje = String(valor ?? texto.value ?? '').trim()
  if (cargando.value) return

  if (!mensaje) {
    setAnim('confundido', { ms: TIEMPOS_REPOSO.confundido })
    setAnimViva('confundido', { ms: TIEMPOS_REPOSO.confundido })
    return
  }

  const reaccion = oculto ? null : reaccionLocal(mensaje)
  const historial = mensajes.value.slice(-8).map((m) => ({
    role: m.emisor === 'cliente' ? 'user' : 'assistant',
    content: m.contenido,
  }))

  if (!oculto) {
    cancelarSaludo()
    agregarMensaje({ id: idMensaje('u'), emisor: 'cliente', contenido: mensaje })
    texto.value = ''
  }

  const miGeneracion = ++generacion
  cargando.value = true
  setAnim('pensar')
  setAnimViva('pensar')

  if (lentoTimer) clearTimeout(lentoTimer)
  lentoTimer = setTimeout(() => {
    lentoTimer = null
    if (cargando.value && miGeneracion === generacion) {
      setAnim('yacasi')
      setAnimViva('yacasi')
    }
  }, ESPERA_LENTA)

  try {
    const data = await chatbot.enviar(mensaje, historial)
    if (miGeneracion !== generacion) return

    const final = reaccion || data.animacion || 'check'
    agregarMensaje({
      id: idMensaje('b'),
      emisor: 'asistente',
      contenido: data.respuesta || 'Sin respuesta',
      animacion: final,
      opciones: data.opciones || [],
    })
    setAnim(final)
    setAnimViva(final)
  } catch (error) {
    if (miGeneracion !== generacion) return

    agregarMensaje({
      id: idMensaje('e'),
      emisor: 'asistente',
      contenido: 'No pude conectar con el servicio del laboratorio. Inténtalo de nuevo.',
      animacion: 'triste',
    })
    setAnim('triste')
    setAnimViva('triste')
  } finally {
    if (lentoTimer) {
      clearTimeout(lentoTimer)
      lentoTimer = null
    }
    if (miGeneracion === generacion) {
      cargando.value = false
      irAlFondo()
      reiniciarSueno()
    }
  }
}

function saludar() {
  if (saludoEnviado || mensajes.value.length > 0) return
  cancelarSaludo()
  saludoTimer = setTimeout(() => {
    saludoTimer = null
    if (saludoEnviado || mensajes.value.length > 0) return
    saludoEnviado = true
    enviar('hola', true)
  }, 300)
}

function abrir() {
  // El primer clic tras el sueño solo despierta, no abre el chat.
  if (Date.now() < despertandoHasta) return

  const enojado = registrarClic()
  abierto.value = true
  if (!cargando.value && !enojado) {
    setAnim('reposo')
    setAnimViva('reposo')
  }
  saludar()
  vivaColocada = false
  nextTick(() => {
    inputEl.value?.focus()
    ubicarViva(false)
  })
}

function minimizar() {
  abierto.value = false
  if (!cargando.value) {
    if (reposoTimer) {
      clearTimeout(reposoTimer)
      reposoTimer = null
    }
    if (reposoVivaTimer) {
      clearTimeout(reposoVivaTimer)
      reposoVivaTimer = null
    }
    animacion.value = 'reposo'
    animacionViva.value = 'reposo'
  }
  vivaColocada = false
  reiniciarSueno()
}

function cerrar() {
  generacion += 1
  abierto.value = false
  mensajes.value = []
  saludoEnviado = false
  cargando.value = false
  animacion.value = 'reposo'
  animacionViva.value = 'reposo'
  vivaColocada = false
  clics = []
  despertandoHasta = 0
  cancelarSaludo()

  for (const temporizador of [reposoTimer, reposoVivaTimer, lentoTimer]) {
    if (temporizador) clearTimeout(temporizador)
  }
  reposoTimer = null
  reposoVivaTimer = null
  lentoTimer = null

  reiniciarSueno()
}

function clickOpcion(op) {
  if (op.accion === 'login') return irLogin()
  return enviar(String(op.numero))
}

function irLogin() {
  abierto.value = false
  router.push({ name: 'login', query: { redirect: route.fullPath } })
}

watch(
  () => auth.token,
  () => {
    const estabaAbierto = abierto.value
    cerrar()
    if (estabaAbierto) abrir()
  }
)

// Al aparecer el indicador de escritura la mascota viva viaja hasta él.
watch(cargando, () => irAlFondo())

function alRedimensionar() {
  ubicarViva(false)
}

onMounted(() => {
  reiniciarSueno()
  window.addEventListener('keydown', alActivar, { passive: true })
  window.addEventListener('pointerdown', alActivar, { passive: true })
  window.addEventListener('resize', alRedimensionar)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', alActivar)
  window.removeEventListener('pointerdown', alActivar)
  window.removeEventListener('resize', alRedimensionar)

  for (const temporizador of [reposoTimer, reposoVivaTimer, suenoTimer, lentoTimer, saludoTimer]) {
    if (temporizador) clearTimeout(temporizador)
  }
  reposoTimer = null
  reposoVivaTimer = null
  suenoTimer = null
  lentoTimer = null
  saludoTimer = null
})
</script>
