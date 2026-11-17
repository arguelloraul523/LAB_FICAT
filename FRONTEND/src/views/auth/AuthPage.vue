<template>
  <div class="auth-fondo row items-center justify-center">
    <q-card class="auth-card">
      <q-card-section class="auth-header">
        <q-btn
          flat
          dense
          no-caps
          icon="arrow_back"
          label="Volver al inicio"
          class="btn-volver"
          @click="router.push({ name: 'inicio' })"
        />

        <div class="auth-brand">
          <div class="logo-circulo flex flex-center">
            <svg viewBox="0 0 24 24" class="logo-svg" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div class="brand-title">LABFICAT</div>
            <div class="brand-subtitle">Laboratorio de Caracterización Fisicoquímica de Alimentos</div>
          </div>
        </div>
      </q-card-section>

      <q-tabs
        v-model="tab"
        dense
        class="auth-tabs"
        indicator-color="primary"
        active-color="primary"
        align="justify"
        no-caps
      >
        <q-tab name="ingresar" label="Ingresar" />
        <q-tab name="registrar" label="Crear cuenta" />
      </q-tabs>
      <q-separator />

      <q-tab-panels v-model="tab" animated>
        <q-tab-panel name="ingresar" class="auth-panel">
          <div class="panel-heading">
            <h1>Bienvenido de nuevo</h1>
            <p>Ingresa para consultar tus solicitudes y resultados.</p>
          </div>

          <q-form novalidate @submit="ingresar" class="formulario" @validation-error="validacionFallida">
            <q-input
              v-model.trim="login.correo"
              type="text"
              inputmode="email"
              autocomplete="email"
              label="Correo electrónico"
              outlined
              rounded
              lazy-rules
              :rules="[reglaCorreo]"
            >
              <template #prepend><q-icon name="mail" color="primary" /></template>
            </q-input>

            <q-input
              v-model="login.contrasena"
              :type="mostrarLogin ? 'text' : 'password'"
              autocomplete="current-password"
              label="Contraseña"
              outlined
              rounded
              lazy-rules
              :rules="[reglaRequerido('La contraseña')]"
            >
              <template #prepend><q-icon name="lock" color="primary" /></template>
              <template #append>
                <q-icon
                  :name="mostrarLogin ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  :aria-label="mostrarLogin ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  @click="mostrarLogin = !mostrarLogin"
                />
              </template>
            </q-input>

            <div class="text-right">
              <q-btn flat dense color="primary" label="¿Olvidaste tu contraseña?" to="/recuperar" no-caps />
            </div>

            <q-btn
              type="submit"
              color="primary"
              label="Iniciar sesión"
              class="full-width submit-btn"
              :loading="auth.cargando"
              no-caps
              unelevated
              rounded
            />
          </q-form>
        </q-tab-panel>

        <q-tab-panel name="registrar" class="auth-panel registro-panel">
          <div class="panel-heading">
            <h1>Crea tu cuenta</h1>
            <p>Completa tus datos para solicitar análisis en LABFICAT.</p>
          </div>

          <q-banner v-if="esCorreoSena" class="sena-banner" rounded dense>
            <template #avatar><q-icon name="verified" color="primary" /></template>
            Detectamos un correo institucional SENA. Después de registrarte podrás solicitar
            la verificación para obtener prioridad <b>A1</b> y cotización exonerada.
          </q-banner>

          <q-form novalidate @submit="registrar" class="formulario" @validation-error="validacionFallida">
            <div class="section-title">
              <q-icon name="person" />
              <span>Datos personales</span>
            </div>

            <div class="row q-col-gutter-sm">
              <q-input
                v-model.trim="reg.nombres"
                label="Nombres"
                required
                outlined
                rounded
                class="col-12 col-sm-6"
                lazy-rules
                :rules="[reglaRequerido('Los nombres')]"
              />
              <q-input
                v-model.trim="reg.apellidos"
                label="Apellidos"
                required
                outlined
                rounded
                class="col-12 col-sm-6"
                lazy-rules
                :rules="[reglaRequerido('Los apellidos')]"
              />
            </div>

            <div class="row q-col-gutter-sm">
              <q-select
                v-model="reg.tipoDocumento"
                label="Tipo de documento"
                required
                outlined
                rounded
                class="col-12 col-sm-5"
                :options="tiposDocumento"
                emit-value
                map-options
                :disable="esEmpresa"
              />
              <q-input
                v-model.trim="reg.numeroDocumento"
                :label="esEmpresa ? 'NIT' : 'Número de documento'"
                required
                outlined
                rounded
                class="col-12 col-sm-7"
                inputmode="numeric"
                lazy-rules
                :rules="[reglaDocumento]"
              />
            </div>

            <div class="section-title">
              <q-icon name="contact_phone" />
              <span>Datos de contacto</span>
            </div>

            <q-input
              v-model.trim="reg.correo"
              type="text"
              inputmode="email"
              autocomplete="email"
               label="Correo electrónico"
               required
              outlined
              rounded
              lazy-rules
              :rules="[reglaCorreo]"
            >
              <template #prepend><q-icon name="mail" color="primary" /></template>
              <template #append>
                <q-badge :color="esCorreoSena ? 'primary' : 'grey-7'" rounded>
                  {{ esCorreoSena ? 'SENA' : 'Externo' }}
                </q-badge>
              </template>
            </q-input>

            <q-input
              v-model.trim="reg.telefono"
              type="tel"
              autocomplete="tel"
               label="Teléfono o celular"
               required
              outlined
              rounded
              lazy-rules
              :rules="[reglaTelefono]"
            >
              <template #prepend><q-icon name="phone" color="primary" /></template>
            </q-input>

            <q-card flat bordered class="empresa-card">
              <q-card-section class="empresa-selector">
                <div class="row items-center no-wrap">
                  <q-icon name="business" size="28px" color="primary" class="q-mr-md" />
                  <div class="col">
                    <div class="empresa-titulo">¿La solicitud es para una empresa?</div>
                    <div class="empresa-ayuda">Actívalo para registrar razón social, NIT y contacto empresarial.</div>
                  </div>
                  <q-toggle v-model="esEmpresa" color="primary" />
                </div>
              </q-card-section>

              <q-slide-transition>
                <q-card-section v-if="esEmpresa" class="empresa-datos">
                  <div class="empresa-aviso">
                    <q-icon name="info" />
                    <span>Estos datos aparecerán en la cotización y en los documentos del servicio.</span>
                  </div>

                  <q-input
                    v-model.trim="reg.razonSocial"
                    label="Razón social"
                    required
                    outlined
                    rounded
                    dense
                    lazy-rules
                    :rules="[reglaEmpresa('La razón social')]"
                  />
                  <div class="row q-col-gutter-sm">
                    <q-input
                      v-model.trim="reg.personaContacto"
                      label="Persona de contacto"
                      required
                      outlined
                      rounded
                      dense
                      class="col-12 col-sm-6"
                      lazy-rules
                      :rules="[reglaEmpresa('La persona de contacto')]"
                    />
                    <q-input
                      v-model.trim="reg.cargo"
                      label="Cargo"
                      outlined
                      rounded
                      dense
                      class="col-12 col-sm-6"
                    />
                  </div>
                  <q-input v-model.trim="reg.direccion" label="Dirección de la empresa" outlined rounded dense />
                  <div class="row q-col-gutter-sm">
                    <q-input v-model.trim="reg.ciudad" label="Ciudad" outlined rounded dense class="col-12 col-sm-6" />
                    <q-input v-model.trim="reg.departamento" label="Departamento" outlined rounded dense class="col-12 col-sm-6" />
                  </div>
                </q-card-section>
              </q-slide-transition>
            </q-card>

            <div class="section-title">
              <q-icon name="lock" />
              <span>Seguridad</span>
            </div>

            <q-input
              v-model="reg.contrasena"
              :type="mostrarRegistro ? 'text' : 'password'"
              autocomplete="new-password"
               label="Contraseña"
               required
              hint="Mínimo 6 caracteres"
              outlined
              rounded
              lazy-rules
              :rules="[reglaContrasena]"
            >
              <template #prepend><q-icon name="lock" color="primary" /></template>
              <template #append>
                <q-icon
                  :name="mostrarRegistro ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  :aria-label="mostrarRegistro ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  @click="mostrarRegistro = !mostrarRegistro"
                />
              </template>
            </q-input>

            <q-input
              v-model="reg.confirmarContrasena"
              :type="mostrarRegistro ? 'text' : 'password'"
              autocomplete="new-password"
               label="Confirmar contraseña"
               required
              outlined
              rounded
              lazy-rules
              :rules="[reglaConfirmacion]"
            >
              <template #prepend><q-icon name="lock_reset" color="primary" /></template>
            </q-input>

            <p class="nota-privacidad">
              <q-icon name="verified_user" />
              Tu cuenta se crea como Cliente. El rol y los beneficios SENA se validan en el servidor.
            </p>

            <q-btn
              type="submit"
              color="primary"
              label="Crear mi cuenta"
              class="full-width submit-btn"
              :loading="auth.cargando"
              no-caps
              unelevated
              rounded
            />
          </q-form>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { useNotificar } from '@/composables/useNotificar'

const { notificarError, validacionFallida } = useNotificar()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const tab = ref(route.name === 'registro' ? 'registrar' : 'ingresar')
const mostrarLogin = ref(false)
const mostrarRegistro = ref(false)
const esEmpresa = ref(false)
const tiposDocumento = [
  { label: 'Cédula de ciudadanía', value: 'CC' },
  { label: 'Tarjeta de identidad', value: 'TI' },
  { label: 'Cédula de extranjería', value: 'CE' },
  { label: 'NIT', value: 'NIT' },
]

const login = reactive({ correo: '', contrasena: '' })
const reg = reactive({
  nombres: '',
  apellidos: '',
  tipoDocumento: 'CC',
  numeroDocumento: '',
  correo: '',
  telefono: '',
  razonSocial: '',
  direccion: '',
  ciudad: '',
  departamento: '',
  cargo: '',
  personaContacto: '',
  contrasena: '',
  confirmarContrasena: '',
})

const esCorreoSena = computed(() => reg.correo.trim().toLowerCase().endsWith('@sena.edu.co'))
const reglaRequerido = (nombre) => (valor) => Boolean(String(valor || '').trim()) || `${nombre} es obligatorio`
const reglaCorreo = (valor) => {
  if (!String(valor || '').trim()) return 'El correo es obligatorio'
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor) || 'Escribe un correo válido'
}
const reglaDocumento = (valor) => {
  if (!String(valor || '').trim()) return 'El número de documento es obligatorio'
  return /^[A-Za-z0-9-]{4,20}$/.test(valor) || 'Usa entre 4 y 20 caracteres válidos'
}
const reglaEmpresa = (nombre) => (valor) => {
  if (!esEmpresa.value) return true
  return Boolean(String(valor || '').trim()) || `${nombre} es obligatoria`
}
const reglaTelefono = (valor) => {
  if (!String(valor || '').trim()) return 'El teléfono es obligatorio'
  return /^[0-9+()\s-]{7,20}$/.test(valor) || 'Escribe un teléfono válido'
}
const reglaContrasena = (valor) => String(valor || '').length >= 6 || 'La contraseña debe tener mínimo 6 caracteres'
const reglaConfirmacion = (valor) => valor === reg.contrasena || 'Las contraseñas no coinciden'

watch(esEmpresa, (activa) => {
  if (activa) {
    reg.tipoDocumento = 'NIT'
    return
  }
  if (reg.tipoDocumento === 'NIT') reg.tipoDocumento = 'CC'
})

async function ingresar() {
  try {
    await auth.login(login.correo, login.contrasena)
    router.push(route.query.redirect || { name: 'panel' })
  } catch (error) {
    notificarError(error, 'No se pudo iniciar sesión')
  }
}

async function registrar() {
  const payload = Object.fromEntries(
    Object.entries(reg).filter(([campo, valor]) => !['razonSocial', 'direccion', 'ciudad', 'departamento', 'cargo', 'personaContacto'].includes(campo) || String(valor).trim())
  )

  try {
    await auth.registrar(payload)
    router.push({ name: 'panel' })
  } catch (error) {
    notificarError(error, 'No se pudo registrar')
  }
}
</script>

<style scoped>
.auth-fondo {
  min-height: 100vh;
  padding: 24px 16px;
  background:
    radial-gradient(circle at 10% 10%, rgba(255, 255, 255, 0.14), transparent 30%),
    linear-gradient(135deg, #39a900 0%, #267d00 42%, #00324d 100%);
}

.auth-card {
  width: 100%;
  max-width: 620px;
  overflow: hidden;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 24px 70px rgba(0, 35, 60, 0.28);
}

.auth-header {
  padding: 8px 28px 22px;
}

.btn-volver {
  margin-left: -3px;
  color: #267d00;
  font-size: 12px;
  font-weight: 700;
}

.auth-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 16px;
}

.logo-circulo {
  width: 52px;
  height: 52px;
  flex: 0 0 auto;
  color: #fff;
  background: #39a900;
  border-radius: 50%;
  box-shadow: 0 5px 15px rgba(57, 169, 0, 0.3);
}

.logo-svg {
  width: 30px;
  height: 30px;
  fill: currentColor;
}

.brand-title {
  color: #0b2238;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.brand-subtitle {
  max-width: 430px;
  color: #627d98;
  font-size: 12px;
  line-height: 1.4;
}

.auth-tabs {
  padding: 0 28px;
}

.auth-panel {
  padding: 28px;
}

.panel-heading {
  margin-bottom: 24px;
}

.panel-heading h1 {
  margin: 0;
  color: #0b2238;
  font-size: 24px;
  line-height: 1.25;
  font-weight: 800;
  letter-spacing: normal;
}

.panel-heading p {
  margin: 6px 0 0;
  color: #627d98;
  font-size: 14px;
}

.formulario {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  color: #0b2238;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.section-title .q-icon {
  color: #39a900;
}

.sena-banner {
  margin-bottom: 18px;
  color: #226d00;
  background: #eef9e8;
  font-size: 13px;
  line-height: 1.45;
}

.empresa-card {
  margin: 0;
  overflow: hidden;
  color: #0b2238;
  border-color: #dce8ef;
  border-radius: 14px;
  background: #fbfdfe;
}

.empresa-selector {
  padding: 14px 16px;
}

.empresa-titulo {
  color: #0b2238;
  font-size: 14px;
  font-weight: 700;
}

.empresa-ayuda {
  margin-top: 3px;
  color: #627d98;
  font-size: 12px;
  line-height: 1.35;
}

.empresa-datos {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 16px 16px;
  border-top: 1px solid #e7eef2;
  background: #f7fbfd;
}

.empresa-aviso {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding-top: 14px;
  color: #49677e;
  font-size: 12px;
  line-height: 1.4;
}

.empresa-aviso .q-icon {
  flex: 0 0 auto;
  color: #39a900;
}

.nota-privacidad {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 0;
  color: #627d98;
  font-size: 12px;
  line-height: 1.45;
}

.nota-privacidad .q-icon {
  flex: 0 0 auto;
  color: #39a900;
}

.submit-btn {
  min-height: 46px;
  margin-top: 4px;
  font-weight: 700;
}

@media (max-width: 599px) {
  .auth-fondo {
    align-items: flex-start;
    padding: 10px;
  }

  .auth-card {
    margin: 0;
    border-radius: 16px;
  }

  .auth-header,
  .auth-panel {
    padding-left: 18px;
    padding-right: 18px;
  }

  .auth-tabs {
    padding: 0 18px;
  }

  .brand-subtitle {
    font-size: 11px;
  }

  .panel-heading h1 {
    font-size: 21px;
    line-height: 1.25;
  }
}
</style>
