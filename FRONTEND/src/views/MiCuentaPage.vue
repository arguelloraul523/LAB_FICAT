<script setup>
/**
 * VISTA — /views/MiCuentaPage.vue
 * Pantalla "Mi cuenta": perfil, seguridad, preferencias, verificación SENA y
 * notificaciones. Todos los datos vienen de `services/perfil.service.js`.
 * Diseño: mockup "Glass Minimal" (misma paleta SENA).
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '@/store/auth'
import { useNotificar } from '@/composables/useNotificar'
import HeroPerfil from '@/components/Perfil/HeroPerfil.vue'
import TarjetaMetrica from '@/components/Perfil/TarjetaMetrica.vue'
import CampoPerfil from '@/components/Perfil/CampoPerfil.vue'
import { formatoCOP, formatDate } from '@/utils/formato'
// Reglas de Quasar: el navegador no valida nada (sin type=email/required).
import { obligatorio, correo as reglaCorreo } from '@/utils/reglas'
import * as perfilApi from '@/services/perfil.service'

const auth = useAuthStore()
const { notificarOk, notificarError } = useNotificar()

const tab = ref('perfil')
const cargando = ref(true)

const parametros = ref({})
const tipologias = ref([])
const notificaciones = ref([])
const metricas = ref({ solicitudes: null, muestras: null, informes: null, pagos: null })

const user = computed(() => auth.user || {})
const esSena = computed(() => auth.esSena || user.value.tipoUsuario === 'SENA')
const nombreCompleto = computed(
  () => `${user.value.nombres || ''} ${user.value.apellidos || ''}`.trim() || auth.correo || 'Usuario'
)
const iniciales = computed(() =>
  nombreCompleto.value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
)
const institucion = computed(
  () =>
    parametros.value.nombreLaboratorio ||
    parametros.value.descripcionLaboratorio ||
    'LABFICAT — Laboratorio de Caracterización Fisicoquímica de Alimentos'
)
const documento = computed(() => {
  const tipo = user.value.tipoDocumento || ''
  const numero = user.value.numeroDocumento || ''
  return numero ? `${tipo} ${numero}`.trim() : ''
})
const sede = computed(() => {
  const partes = [user.value.ciudad, user.value.departamento].filter(Boolean)
  return partes.length ? partes.join(', ') : parametros.value.direccion || 'No registrada'
})
const roles = computed(() => user.value.roles || [])
const noLeidas = computed(() => notificaciones.value.filter((n) => !n.leida).length)

// ---------- Edición del perfil ----------
const dialogoEditar = ref(false)
const guardandoEdit = ref(false)
const edit = reactive({
  nombres: '',
  apellidos: '',
  telefono: '',
  razonSocial: '',
  direccion: '',
  ciudad: '',
  departamento: '',
  cargo: '',
  personaContacto: '',
  tipologia: null,
})

function abrirEditar() {
  const u = user.value
  Object.assign(edit, {
    nombres: u.nombres || '',
    apellidos: u.apellidos || '',
    telefono: u.telefono || '',
    razonSocial: u.razonSocial || '',
    direccion: u.direccion || '',
    ciudad: u.ciudad || '',
    departamento: u.departamento || '',
    cargo: u.cargo || '',
    personaContacto: u.personaContacto || '',
    tipologia: typeof u.tipologia === 'object' && u.tipologia ? u.tipologia._id : u.tipologia || null,
  })
  dialogoEditar.value = true
}

async function guardarPerfil() {
  guardandoEdit.value = true
  try {
    // El servidor solo acepta los datos propios (nunca rol/tipoUsuario/activo).
    const payload = { ...edit }
    if (!payload.tipologia) delete payload.tipologia
    await perfilApi.actualizarPerfil(payload)
    await auth.cargarPerfil()
    tipologiaSel.value = edit.tipologia || ''
    notificarOk('Perfil actualizado')
    dialogoEditar.value = false
  } catch (e) {
    notificarError(e, 'No se pudo actualizar el perfil')
  } finally {
    guardandoEdit.value = false
  }
}

// ---------- Seguridad ----------
const seg = reactive({ contrasenaActual: '', contrasenaNueva: '', confirmarContrasena: '' })
const guardandoSeg = ref(false)

async function guardarContrasena() {
  if (seg.contrasenaNueva !== seg.confirmarContrasena) {
    notificarError('La nueva contraseña y su confirmación no coinciden')
    return
  }
  guardandoSeg.value = true
  try {
    await perfilApi.cambiarContrasena({ ...seg })
    notificarOk('Contraseña actualizada')
    seg.contrasenaActual = ''
    seg.contrasenaNueva = ''
    seg.confirmarContrasena = ''
  } catch (e) {
    notificarError(e, 'No se pudo cambiar la contraseña')
  } finally {
    guardandoSeg.value = false
  }
}

// ---------- Preferencias ----------
const tipologiaSel = ref('')
const guardandoPref = ref(false)

async function guardarTipologia() {
  guardandoPref.value = true
  try {
    await perfilApi.cambiarTipologia(tipologiaSel.value)
    await auth.cargarPerfil()
    notificarOk('Preferencia guardada')
  } catch (e) {
    notificarError(e, 'No se pudo guardar la tipología')
  } finally {
    guardandoPref.value = false
  }
}

// ---------- Verificación SENA ----------
const verif = reactive({
  correoInstitucional: '',
  numeroFicha: '',
  numeroContratoCedula: '',
  archivoSoporte: null,
})
const enviandoVerif = ref(false)

async function enviarVerificacion() {
  if (!verif.archivoSoporte) {
    notificarError('Adjunta el soporte (PDF o imagen)')
    return
  }
  enviandoVerif.value = true
  try {
    const fd = new FormData()
    fd.append('correoInstitucional', verif.correoInstitucional)
    fd.append('numeroFicha', verif.numeroFicha)
    fd.append('numeroContratoCedula', verif.numeroContratoCedula)
    fd.append('archivoSoporte', verif.archivoSoporte)
    await perfilApi.enviarVerificacion(fd)
    notificarOk('Solicitud de verificación enviada')
    verif.correoInstitucional = ''
    verif.numeroFicha = ''
    verif.numeroContratoCedula = ''
    verif.archivoSoporte = null
  } catch (e) {
    notificarError(e, 'No se pudo enviar la verificación')
  } finally {
    enviandoVerif.value = false
  }
}

// ---------- Notificaciones ----------
async function marcarLeida(n) {
  if (n.leida) return
  try {
    await perfilApi.marcarNotificacion(n._id)
    n.leida = true
  } catch (e) {
    notificarError(e, 'No se pudo marcar como leída')
  }
}

// ---------- Multirrol ----------
const cambiandoRol = ref(false)

async function activarRol(rolId) {
  cambiandoRol.value = true
  try {
    await perfilApi.cambiarRol(rolId)
    await auth.cargarPerfil()
    notificarOk('Rol activo actualizado')
  } catch (e) {
    notificarError(e, 'No se pudo cambiar el rol')
  } finally {
    cambiandoRol.value = false
  }
}

// ---------- Acciones del hero ----------
const dialogoCred = ref(false)

function imprimir() {
  window.print()
}

onMounted(async () => {
  await Promise.allSettled([
    auth.cargarPerfil(),
    perfilApi.cargarParametros().then((r) => {
      parametros.value = Object.fromEntries((r?.data || []).map((p) => [p.clave, p.valor]))
    }),
    perfilApi.cargarTipologias().then((r) => {
      tipologias.value = r?.data || []
    }),
    perfilApi.cargarNotificaciones().then((r) => {
      notificaciones.value = r?.data || []
    }),
    perfilApi.cargarMetricas().then((m) => {
      metricas.value = m
    }),
  ])
  const t = user.value.tipologia
  tipologiaSel.value = typeof t === 'object' && t ? t._id : t || ''
  cargando.value = false
})
</script>

<template>
  <div class="mi-cuenta">
    <HeroPerfil
      :iniciales="iniciales"
      :nombre="nombreCompleto"
      :rol="user.rol?.nombre || ''"
      :tipo-usuario="user.tipoUsuario || ''"
      :es-sena="esSena"
      :activo="user.activo !== false"
      :institucion="institucion"
      :documento="documento"
      @imprimir="imprimir"
      @validar="dialogoCred = true"
    />

    <!-- Sub-navegación en pills -->
    <nav class="subnav glass-card">
      <q-tabs
        v-model="tab"
        no-caps
        align="left"
        class="tabs-perfil"
        active-color="white"
        indicator-color="transparent"
        outside-arrows
        mobile-arrows
      >
        <q-tab name="perfil" icon="person" label="Perfil" />
        <q-tab name="seguridad" icon="shield" label="Seguridad" />
        <q-tab name="preferencias" icon="tune" label="Preferencias" />
        <q-tab name="verificacion" icon="domain_verification" label="Verificación SENA" />
        <q-tab name="notificaciones" icon="notifications" label="Notificaciones">
          <q-badge v-if="noLeidas" color="negative" floating>{{ noLeidas }}</q-badge>
        </q-tab>
      </q-tabs>
      <div class="subnav-sync">
        <span class="sync-dot" />
        <span>Sesión sincronizada</span>
      </div>
    </nav>

    <q-tab-panels v-model="tab" animated class="paneles">
      <!-- ================= PERFIL ================= -->
      <q-tab-panel name="perfil" class="q-pa-none">
        <div v-if="cargando" class="row justify-center q-py-xl">
          <q-spinner color="primary" size="40px" />
        </div>

        <template v-else>
          <!-- Métricas -->
          <div class="grid-metricas q-mt-md">
            <TarjetaMetrica
              v-if="metricas.solicitudes"
              titulo="Solicitudes en curso"
              :valor="metricas.solicitudes.total"
              icono="assignment"
              color="azul"
              :progreso="metricas.solicitudes.total ? Math.round(((metricas.solicitudes.total - metricas.solicitudes.enTramite) / metricas.solicitudes.total) * 100) : 0"
              :nota="`${metricas.solicitudes.enTramite} en trámite`"
            />
            <TarjetaMetrica
              v-if="metricas.pagos"
              titulo="Tarifas / Facturación"
              :valor="esSena ? '$0 COP' : formatoCOP(metricas.pagos.total)"
              icono="payments"
              color="primary"
              :mensaje="esSena ? 'Exoneración SENA' : ''"
              :nota="`${metricas.pagos.aprobados.length} pagos aprobados`"
            />
            <TarjetaMetrica
              v-if="metricas.muestras"
              titulo="Muestras en laboratorio"
              :valor="metricas.muestras.total"
              icono="science"
              color="indigo"
              :nota="metricas.muestras.total ? 'En proceso' : 'Sin muestras en curso'"
            />
            <TarjetaMetrica
              v-if="metricas.informes"
              titulo="Informes validados"
              :valor="metricas.informes.total"
              icono="description"
              color="ambar"
              :nota="metricas.informes.total ? 'Con firma digital' : 'Aún sin informes aprobados'"
            />
          </div>

          <div class="grid-perfil q-mt-lg">
            <!-- Datos -->
            <section class="panel-glass glass-card">
              <div class="panel-head">
                <div class="panel-head__info">
                  <span class="panel-head__icono"><q-icon name="fingerprint" size="20px" /></span>
                  <div>
                    <h2 class="panel-titulo">Datos del Perfil</h2>
                    <p class="panel-sub">Información de tu cuenta en LABFICAT</p>
                  </div>
                </div>
                <div class="panel-head__acciones">
                  <span class="chip-lectura">LECTURA OFICIAL</span>
                  <q-btn flat dense no-caps color="primary" icon="edit" label="Editar" @click="abrirEditar" />
                </div>
              </div>

              <div class="grid-campos">
                <CampoPerfil etiqueta="Correo" :valor="user.correo || '—'" icono="mail" :verificado="!!user.correo" :nota="user.correo ? 'Correo de la cuenta' : ''" />
                <CampoPerfil etiqueta="Teléfono" :valor="user.telefono || 'No registrado'" icono="call" />
                <CampoPerfil etiqueta="Documento de identidad" :valor="documento || 'No registrado'" icono="badge" :verificado="!!documento" />
                <CampoPerfil etiqueta="Fecha de vinculación" :valor="user.createdAt ? formatDate(user.createdAt) : '—'" icono="calendar_today" :nota="user.createdAt ? 'Fecha de registro' : ''" />
                <CampoPerfil etiqueta="Ciudad / Sede" :valor="sede" icono="pin_drop" ancho />
                <CampoPerfil v-if="user.razonSocial || parametros.nit" etiqueta="Razón social / NIT" :valor="[user.razonSocial, parametros.nit].filter(Boolean).join(' · ')" icono="business" ancho />
              </div>

              <div class="banner-imparcialidad">
                <div class="banner-imparcialidad__info">
                  <span class="banner-imparcialidad__icono"><q-icon name="encrypted" size="20px" /></span>
                  <div>
                    <div class="banner-imparcialidad__titulo">
                      Garantía de imparcialidad
                      <span class="chip-ciego">CÓDIGO CIEGO</span>
                    </div>
                    <p class="banner-imparcialidad__texto">
                      Los ensayos se procesan con código ciego: el área técnica no recibe tus datos personales.
                    </p>
                  </div>
                </div>
                <span class="banner-imparcialidad__estado">AUDITORÍA VIGENTE</span>
              </div>
            </section>

            <!-- Gobernanza + Seguridad -->
            <div class="columna-derecha">
              <section class="panel-glass glass-card">
                <div class="panel-head">
                  <div class="panel-head__info">
                    <span class="panel-head__icono panel-head__icono--navy"><q-icon name="admin_panel_settings" size="20px" /></span>
                    <div>
                      <h2 class="panel-titulo">Gobernanza y Privilegios</h2>
                      <p class="panel-sub">Rol activo y roles disponibles</p>
                    </div>
                  </div>
                  <q-icon name="shield" size="20px" class="text-grey-5" />
                </div>

                <div class="rol-activo">
                  <div class="rol-activo__top">
                    <span class="rol-activo__chip">ROL PRIMARIO ACTIVO</span>
                    <span class="rol-activo__nivel">{{ esSena ? 'PRIORIDAD A1' : 'PRIORIDAD A2' }}</span>
                  </div>
                  <h3 class="rol-activo__nombre">{{ user.rol?.nombre || 'Sin rol' }}</h3>
                  <div class="rol-activo__meta">
                    <span class="badge-mini">
                      <q-icon name="verified" size="13px" />
                      {{ esSena ? 'Autorizado SENA' : (user.tipoUsuario || 'EXTERNO') }}
                    </span>
                    <span class="rol-activo__sesion">{{ auth.isAuthenticated ? 'Sesión activa' : 'Sin sesión' }}</span>
                  </div>
                </div>

                <div v-if="roles.length > 1" class="roles-lista">
                  <span class="roles-lista__titulo">Roles disponibles (multirrol)</span>
                  <div
                    v-for="r in roles"
                    :key="r._id"
                    class="rol-item"
                    :class="{ 'rol-item--activo': String(user.rol?._id) === String(r._id) }"
                  >
                    <div class="rol-item__info">
                      <span class="rol-item__icono"><q-icon name="school" size="17px" /></span>
                      <span class="rol-item__nombre">{{ r.nombre }}</span>
                    </div>
                    <q-badge v-if="String(user.rol?._id) === String(r._id)" color="primary" label="Activo" />
                    <q-btn
                      v-else
                      flat
                      dense
                      no-caps
                      color="primary"
                      label="Activar"
                      :disable="cambiandoRol"
                      @click="activarRol(r._id)"
                    />
                  </div>
                </div>
                <p v-else class="rol-unico">Tu cuenta tiene un único rol asignado.</p>
              </section>

              <section class="panel-glass glass-card seguridad-mini">
                <div class="seguridad-mini__head">
                  <div class="seguridad-mini__estado">
                    <span class="sync-dot" />
                    <span>Seguridad de la sesión</span>
                  </div>
                  <span class="mono-chip">JWT ACTIVO</span>
                </div>
                <p class="seguridad-mini__texto">
                  La sesión usa un token firmado por el backend. Cambia tu contraseña cuando lo necesites.
                </p>
                <div class="seguridad-mini__pie">
                  <span class="seguridad-mini__fecha">Token válido</span>
                  <button type="button" class="link-verde" @click="tab = 'seguridad'">
                    Gestionar contraseña
                    <q-icon name="arrow_forward" size="14px" />
                  </button>
                </div>
              </section>
            </div>
          </div>

          <!-- Banner institucional -->
          <div class="banner-institucional glass-card q-mt-lg">
            <div class="banner-institucional__info">
              <span class="banner-institucional__icono"><q-icon name="shield_lock" size="20px" /></span>
              <div>
                <div class="banner-institucional__titulo">
                  Datos Institucionales Protegidos
                  <span class="chip-solo-lectura">SOLO LECTURA</span>
                </div>
                <p class="banner-institucional__texto">
                  La información personal y la sede se administran desde el perfil. Para cambios de correo o
                  institución, contacta a la coordinación del laboratorio o a soporte LABFICAT.
                </p>
              </div>
            </div>
            <a class="banner-institucional__btn" :href="`mailto:${parametros.correoInstitucional || 'labficat@sena.edu.co'}`">
              <q-icon name="support_agent" size="16px" />
              <span>Contactar soporte</span>
            </a>
          </div>
        </template>
      </q-tab-panel>

      <!-- ================= SEGURIDAD ================= -->
      <q-tab-panel name="seguridad" class="q-pa-none">
        <section class="panel-glass glass-card q-mt-md panel-estrecho">
          <div class="panel-head">
            <div class="panel-head__info">
              <span class="panel-head__icono"><q-icon name="lock" size="20px" /></span>
              <div>
                <h2 class="panel-titulo">Seguridad de la sesión</h2>
                <p class="panel-sub">Cambia tu contraseña cuando lo necesites</p>
              </div>
            </div>
            <span class="chip-estado"><span class="punto-verde" /> JWT activo</span>
          </div>

          <q-form novalidate class="q-gutter-md q-mt-sm" @submit.prevent="guardarContrasena">
            <q-input v-model="seg.contrasenaActual" type="password" label="Contraseña actual" outlined dense lazy-rules :rules="[(v) => !!v || 'Obligatoria']" />
            <q-input v-model="seg.contrasenaNueva" type="password" label="Nueva contraseña" outlined dense lazy-rules :rules="[(v) => (v && v.length >= 6) || 'Mínimo 6 caracteres']" />
            <q-input v-model="seg.confirmarContrasena" type="password" label="Confirmar nueva contraseña" outlined dense lazy-rules :rules="[(v) => !!v || 'Obligatoria']" />
            <div class="row justify-end">
              <q-btn type="submit" color="primary" no-caps unelevated icon="save" label="Actualizar contraseña" :loading="guardandoSeg" />
            </div>
          </q-form>

          <p class="nota-pie">
            La sesión usa un token JWT firmado por el backend. Si expira, el sistema te pedirá iniciar sesión de nuevo.
          </p>
        </section>
      </q-tab-panel>

      <!-- ================= PREFERENCIAS ================= -->
      <q-tab-panel name="preferencias" class="q-pa-none">
        <section class="panel-glass glass-card q-mt-md panel-estrecho">
          <div class="panel-head">
            <div class="panel-head__info">
              <span class="panel-head__icono"><q-icon name="tune" size="20px" /></span>
              <div>
                <h2 class="panel-titulo">Preferencias</h2>
                <p class="panel-sub">Tipología de cliente (RF-04)</p>
              </div>
            </div>
          </div>

          <q-select
            v-model="tipologiaSel"
            :options="tipologias"
            option-label="nombre"
            option-value="_id"
            emit-value
            map-options
            label="Tipología"
            outlined
            dense
            class="q-mt-sm"
            :rules="[(v) => !!v || 'Selecciona una tipología']"
          />
          <div class="row justify-end q-mt-md">
            <q-btn color="primary" no-caps unelevated icon="save" label="Guardar preferencia" :loading="guardandoPref" @click="guardarTipologia" />
          </div>
          <p class="nota-pie">La tipología permite clasificar tu perfil para las estadísticas del laboratorio.</p>
        </section>
      </q-tab-panel>

      <!-- ================= VERIFICACIÓN SENA ================= -->
      <q-tab-panel name="verificacion" class="q-pa-none">
        <section class="panel-glass glass-card q-mt-md panel-estrecho">
          <div class="panel-head">
            <div class="panel-head__info">
              <span class="panel-head__icono"><q-icon name="domain_verification" size="20px" /></span>
              <div>
                <h2 class="panel-titulo">Verificación SENA</h2>
                <p class="panel-sub">Solo correos @sena.edu.co</p>
              </div>
            </div>
          </div>

          <div v-if="user.tipoUsuario === 'SENA'" class="estado-ok">
            <q-icon name="verified" size="18px" /> Tu cuenta ya está verificada como SENA.
          </div>

          <q-form v-else novalidate class="q-gutter-md q-mt-sm" @submit.prevent="enviarVerificacion">
            <q-input v-model="verif.correoInstitucional" type="text" inputmode="email" label="Correo institucional (@sena.edu.co)" outlined dense lazy-rules :rules="[obligatorio('Obligatorio'), reglaCorreo, (v) => String(v).trim().endsWith('@sena.edu.co') || 'Debe ser @sena.edu.co']" />
            <div class="row q-col-gutter-md">
              <q-input v-model="verif.numeroFicha" label="Número de ficha" outlined dense class="col-12 col-sm-6" />
              <q-input v-model="verif.numeroContratoCedula" label="Contrato / Cédula" outlined dense class="col-12 col-sm-6" />
            </div>
            <q-file v-model="verif.archivoSoporte" label="Soporte (PDF o imagen)" outlined dense accept=".pdf,.jpg,.png" max-file-size="5242880" />
            <div class="row justify-end">
              <q-btn type="submit" color="primary" no-caps unelevated icon="send" label="Enviar solicitud" :loading="enviandoVerif" />
            </div>
          </q-form>
        </section>
      </q-tab-panel>

      <!-- ================= NOTIFICACIONES ================= -->
      <q-tab-panel name="notificaciones" class="q-pa-none">
        <section class="panel-glass glass-card q-mt-md panel-estrecho">
          <div class="panel-head">
            <div class="panel-head__info">
              <span class="panel-head__icono"><q-icon name="notifications" size="20px" /></span>
              <div>
                <h2 class="panel-titulo">Notificaciones</h2>
                <p class="panel-sub">{{ noLeidas }} sin leer</p>
              </div>
            </div>
          </div>

          <div v-if="!notificaciones.length" class="texto-vacio">No tienes notificaciones.</div>
          <q-list v-else separator class="q-mt-sm">
            <q-item v-for="n in notificaciones" :key="n._id" clickable :class="{ 'item-no-leido': !n.leida }" @click="marcarLeida(n)">
              <q-item-section avatar>
                <q-icon :name="n.leida ? 'mark_email_read' : 'notifications_active'" :color="n.leida ? 'grey-5' : 'primary'" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ n.titulo || n.asunto || 'Notificación' }}</q-item-label>
                <q-item-label caption>{{ n.mensaje || n.cuerpo || '' }}</q-item-label>
              </q-item-section>
              <q-item-section side v-if="!n.leida">
                <q-badge color="primary" label="Nueva" />
              </q-item-section>
            </q-item>
          </q-list>
        </section>
      </q-tab-panel>
    </q-tab-panels>

    <!-- Diálogo editar datos del perfil -->
    <q-dialog v-model="dialogoEditar">
      <q-card style="width: 100%; max-width: 640px">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">Editar mis datos</div>
          <div class="text-caption">Solo se actualizan tus datos personales de contacto.</div>
        </q-card-section>
        <q-card-section>
          <q-form novalidate class="q-gutter-md" @submit.prevent="guardarPerfil">
            <div class="row q-col-gutter-md">
              <q-input v-model="edit.nombres" label="Nombres" outlined dense class="col-12 col-sm-6" lazy-rules :rules="[(v) => !!v || 'Obligatorio']" />
              <q-input v-model="edit.apellidos" label="Apellidos" outlined dense class="col-12 col-sm-6" lazy-rules :rules="[(v) => !!v || 'Obligatorio']" />
            </div>
            <div class="row q-col-gutter-md">
              <q-input v-model="edit.telefono" label="Teléfono / celular" outlined dense class="col-12 col-sm-6" />
              <q-input v-model="edit.razonSocial" label="Razón social / empresa" outlined dense class="col-12 col-sm-6" />
            </div>
            <q-input v-model="edit.direccion" label="Dirección" outlined dense />
            <div class="row q-col-gutter-md">
              <q-input v-model="edit.ciudad" label="Ciudad" outlined dense class="col-12 col-sm-6" />
              <q-input v-model="edit.departamento" label="Departamento" outlined dense class="col-12 col-sm-6" />
            </div>
            <div class="row q-col-gutter-md">
              <q-input v-model="edit.cargo" label="Cargo" outlined dense class="col-12 col-sm-6" />
              <q-input v-model="edit.personaContacto" label="Persona de contacto" outlined dense class="col-12 col-sm-6" />
            </div>
            <q-select
              v-if="user.rol?.nombre === 'Cliente'"
              v-model="edit.tipologia"
              :options="tipologias"
              option-label="nombre"
              option-value="_id"
              emit-value
              map-options
              label="Clasificación / Tipología"
              outlined
              dense
              clearable
            />
            <div class="row justify-end q-gutter-sm">
              <q-btn flat label="Cancelar" color="grey-7" no-caps v-close-popup />
              <q-btn type="submit" color="primary" no-caps unelevated icon="save" label="Guardar cambios" :loading="guardandoEdit" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Diálogo validar credenciales -->
    <q-dialog v-model="dialogoCred">
      <q-card style="width: 100%; max-width: 460px">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">Credenciales de la sesión</div>
        </q-card-section>
        <q-card-section class="q-gutter-y-sm">
          <div class="row justify-between"><span class="text-grey-7">Nombre</span><strong>{{ nombreCompleto }}</strong></div>
          <div class="row justify-between"><span class="text-grey-7">Correo</span><strong>{{ user.correo || '—' }}</strong></div>
          <div class="row justify-between"><span class="text-grey-7">Rol activo</span><strong>{{ user.rol?.nombre || '—' }}</strong></div>
          <div class="row justify-between"><span class="text-grey-7">Tipo</span><strong>{{ user.tipoUsuario || '—' }}</strong></div>
          <div class="row justify-between"><span class="text-grey-7">Sesión</span><strong>{{ auth.isAuthenticated ? 'JWT válida' : 'Sin sesión' }}</strong></div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cerrar" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped>
.mi-cuenta {
  max-width: 1240px;
  margin: 0 auto;
  padding-bottom: 24px;
}

/* ---------- Sub-navegación pills ---------- */
.subnav {
  margin-top: 20px;
  border-radius: 16px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.tabs-perfil {
  flex: 1 1 auto;
  min-width: 0;
}
.tabs-perfil :deep(.q-tab) {
  min-height: 40px;
  border-radius: 12px;
  padding: 0 16px;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  transition: background 0.15s ease, color 0.15s ease;
}
.tabs-perfil :deep(.q-tab:hover) {
  background: rgba(241, 245, 249, 0.7);
  color: #0b2238;
}
.tabs-perfil :deep(.q-tab--active) {
  background: #39a900;
  color: #fff;
  box-shadow: 0 4px 18px rgba(57, 169, 0, 0.35);
}
.tabs-perfil :deep(.q-tab__indicator) {
  display: none;
}
.subnav-sync {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
}
.sync-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #39a900;
  box-shadow: 0 0 0 4px rgba(57, 169, 0, 0.12);
  animation: latido 2s ease-in-out infinite;
}
@keyframes latido {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
@media (max-width: 767px) {
  .subnav-sync { display: none; }
}

.paneles {
  background: transparent;
}

/* ---------- Métricas ---------- */
.grid-metricas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

/* ---------- Layout 2 columnas ---------- */
.grid-perfil {
  display: grid;
  grid-template-columns: 1.55fr 1fr;
  gap: 18px;
  align-items: start;
}
.columna-derecha {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
@media (max-width: 1023px) {
  .grid-perfil { grid-template-columns: 1fr; }
}

.panel-glass {
  border-radius: 22px;
  padding: 22px;
}
.panel-estrecho {
  max-width: 720px;
  margin-left: auto;
  margin-right: auto;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.panel-head__info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.panel-head__acciones {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.panel-head__icono {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef9e8;
  color: #226d00;
  border: 1px solid rgba(57, 169, 0, 0.2);
  flex-shrink: 0;
}
.panel-head__icono--navy {
  background: rgba(11, 34, 56, 0.05);
  color: #0b2238;
  border-color: rgba(11, 34, 56, 0.08);
}
.panel-titulo {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0b2238;
  letter-spacing: -0.2px;
}
.panel-sub {
  margin: 0;
  font-size: 11.5px;
  color: #64748b;
}

.chip-lectura,
.chip-estado,
.mono-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.4px;
}
.punto-verde {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #39a900;
}

.grid-campos {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
@media (max-width: 599px) {
  .grid-campos { grid-template-columns: 1fr; }
}

/* ---------- Banner imparcialidad ---------- */
.banner-imparcialidad {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  background: #0b2238;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.banner-imparcialidad__info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.banner-imparcialidad__icono {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.3);
  flex-shrink: 0;
}
.banner-imparcialidad__titulo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.chip-ciego {
  padding: 2px 8px;
  border-radius: 999px;
  background: #39a900;
  color: #fff;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
}
.banner-imparcialidad__texto {
  margin: 2px 0 0;
  font-size: 11.5px;
  color: #cbd5e1;
}
.banner-imparcialidad__estado {
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: #6ee7b7;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

/* ---------- Gobernanza ---------- */
.rol-activo {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border-radius: 16px;
  background: #fff;
  border: 2px solid rgba(57, 169, 0, 0.9);
  box-shadow: 0 10px 26px -20px rgba(57, 169, 0, 0.6);
}
.rol-activo__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.rol-activo__chip {
  align-self: flex-start;
  padding: 3px 10px;
  border-radius: 999px;
  background: #eef9e8;
  color: #226d00;
  border: 1px solid rgba(57, 169, 0, 0.3);
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.4px;
}
.rol-activo__nivel {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
}
.rol-activo__nombre {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: #0b2238;
}
.rol-activo__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.badge-mini {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 999px;
  background: #0b2238;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}
.rol-activo__sesion {
  font-size: 11px;
  color: #64748b;
  font-family: 'JetBrains Mono', monospace;
}

.roles-lista {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.roles-lista__titulo {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: #94a3b8;
}
.rol-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid #e2e8f0;
}
.rol-item--activo {
  background: #eef9e8;
  border-color: rgba(57, 169, 0, 0.35);
}
.rol-item__info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.rol-item__icono {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  color: #475569;
}
.rol-item__nombre {
  font-size: 13px;
  font-weight: 700;
  color: #334155;
}
.rol-unico {
  margin: 14px 0 0;
  font-size: 12px;
  color: #64748b;
}

/* ---------- Seguridad mini ---------- */
.seguridad-mini {
  padding: 18px 20px;
}
.seguridad-mini__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.seguridad-mini__estado {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 700;
  color: #0b2238;
}
.seguridad-mini__texto {
  margin: 10px 0 12px;
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
}
.seguridad-mini__pie {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid #f1f5f9;
}
.seguridad-mini__fecha {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #94a3b8;
}
.link-verde {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  padding: 0;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  color: #39a900;
  cursor: pointer;
}
.link-verde:hover { color: #226d00; text-decoration: underline; }

/* ---------- Banner institucional ---------- */
.banner-institucional {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border-radius: 24px;
  background: linear-gradient(90deg, #f0f9ff 0%, #ffffff 50%, #eef9e8 100%);
}
.banner-institucional__info {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.banner-institucional__icono {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: #0b2238;
  color: #39a900;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.banner-institucional__titulo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 800;
  color: #0b2238;
  flex-wrap: wrap;
}
.chip-solo-lectura {
  padding: 2px 8px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
}
.banner-institucional__texto {
  margin: 4px 0 0;
  font-size: 12px;
  color: #475569;
  max-width: 760px;
}
.banner-institucional__btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 16px;
  background: #fff;
  color: #0b2238;
  border: 1px solid #e2e8f0;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 1px 2px rgba(11, 34, 56, 0.05);
  white-space: nowrap;
}
.banner-institucional__btn:hover { background: #f8fafc; }

/* ---------- Estados y notas ---------- */
.nota-pie {
  margin-top: 14px;
  font-size: 11.5px;
  color: #64748b;
}
.estado-ok {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 14px;
  background: #eef9e8;
  border: 1px solid rgba(57, 169, 0, 0.25);
  color: #226d00;
  font-weight: 700;
  font-size: 13px;
}
.texto-vacio {
  padding: 24px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}
.item-no-leido {
  background: rgba(57, 169, 0, 0.05);
}

@media (max-width: 599px) {
  .panel-glass { padding: 18px; }
  .banner-institucional { padding: 16px; }
}

@media print {
  .subnav,
  .banner-institucional,
  .seguridad-mini {
    display: none !important;
  }
}
</style>
