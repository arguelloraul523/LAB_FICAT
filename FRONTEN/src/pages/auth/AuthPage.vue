<template>
  <div class="auth-fondo row items-center justify-center">
    <q-card class="auth-card card-suave">
      <!-- Logo -->
      <div class="text-center q-pt-lg">
        <div class="logo-circulo flex flex-center q-mx-auto">
          <svg viewBox="0 0 24 24" class="logo-svg">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div class="text-h6 text-weight-bold text-navy q-mt-sm">Laboratorio SENA</div>
        <div class="text-caption text-grey-6">Sistema de Gestión del Laboratorio</div>
      </div>

      <!-- Tabs Ingresar / Registrar -->
      <q-tabs v-model="tab" dense class="q-mt-md text-primary" indicator-color="primary" align="justify" active-color="primary" narrow-indicator>
        <q-tab name="ingresar" label="Ingresar" no-caps />
        <q-tab name="registrar" label="Registrar" no-caps />
      </q-tabs>
      <q-separator />

      <q-tab-panels v-model="tab" animated>
        <!-- ===== INGRESAR ===== -->
        <q-tab-panel name="ingresar">
          <q-form @submit="ingresar" class="q-gutter-md">
            <q-input v-model="login.correo" type="email" label="Correo electrónico" outlined rounded lazy-rules :rules="[v => !!v || 'El correo es obligatorio']">
              <template #prepend><q-icon name="mail" color="primary" /></template>
            </q-input>
            <q-input v-model="login.contrasena" :type="mostrar ? 'text' : 'password'" label="Contraseña" outlined rounded lazy-rules :rules="[v => !!v || 'La contraseña es obligatoria']">
              <template #prepend><q-icon name="lock" color="primary" /></template>
              <template #append>
                <q-icon :name="mostrar ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="mostrar = !mostrar" />
              </template>
            </q-input>

            <div class="text-right">
              <q-btn flat dense color="primary" label="¿Olvidaste tu contraseña?" no-caps to="/recuperar" />
            </div>

            <q-btn type="submit" color="primary" label="Iniciar sesión" class="full-width" :loading="auth.cargando" no-caps unelevated rounded />
          </q-form>
        </q-tab-panel>

        <!-- ===== REGISTRAR ===== -->
        <q-tab-panel name="registrar">
          <q-form @submit="registrar" class="q-gutter-md">
            <!-- El correo determina si es SENA o Externo -->
            <q-input v-model="reg.correo" type="email" label="Correo electrónico" outlined rounded lazy-rules :rules="[v => !!v || 'El correo es obligatorio']">
              <template #prepend><q-icon name="mail" color="primary" /></template>
              <template #append>
                <q-badge :color="esCorreoSena ? 'primary' : 'grey-6'" text-color="white" class="q-px-sm q-py-xs">
                  <q-icon :name="esCorreoSena ? 'verified' : 'person'" size="0.9rem" class="q-mr-xs" />
                  {{ esCorreoSena ? 'SENA' : 'Externo' }}
                </q-badge>
              </template>
            </q-input>

            <q-banner v-if="esCorreoSena" class="bg-green-1 text-primary rounded-borders" dense>
              <template #avatar><q-icon name="verified" color="primary" /></template>
              ¡Correo <b>@sena.edu.co</b> detectado! Podrás solicitar la verificación SENA para obtener
              <b>prioridad A1</b> y <b>cotización $0</b>.
            </q-banner>

            <div class="row q-col-gutter-md">
              <q-input v-model="reg.nombres" label="Nombres" outlined rounded dense class="col-6" lazy-rules :rules="[v => !!v || 'Obligatorio']" />
              <q-input v-model="reg.apellidos" label="Apellidos" outlined rounded dense class="col-6" lazy-rules :rules="[v => !!v || 'Obligatorio']" />
            </div>
            <div class="row q-col-gutter-md">
              <q-select v-model="reg.tipoDocumento" label="Tipo de documento" outlined rounded dense class="col-4" :options="['CC', 'TI', 'CE']" />
              <q-input v-model="reg.numeroDocumento" label="Número de documento" outlined rounded dense class="col-8" lazy-rules :rules="[v => !!v || 'Obligatorio']" />
            </div>
            <q-input v-model="reg.telefono" label="Teléfono / celular" outlined rounded dense lazy-rules :rules="[v => !!v || 'Obligatorio']">
              <template #prepend><q-icon name="phone" color="primary" /></template>
            </q-input>

            <q-input v-model="reg.contrasena" :type="mostrar ? 'text' : 'password'" label="Contraseña (mínimo 6)" outlined rounded dense lazy-rules :rules="[v => (v && v.length >= 6) || 'Mínimo 6 caracteres']">
              <template #prepend><q-icon name="lock" color="primary" /></template>
            </q-input>
            <q-input v-model="reg.confirmarContrasena" :type="mostrar ? 'text' : 'password'" label="Confirmar contraseña (repítela)" outlined rounded dense lazy-rules :rules="[v => v === reg.contrasena || 'Las contraseñas no coinciden']">
              <template #prepend><q-icon name="lock" color="primary" /></template>
              <template #append>
                <q-icon :name="mostrar ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="mostrar = !mostrar" />
              </template>
            </q-input>

            <q-btn type="submit" color="primary" label="Crear cuenta" class="full-width" :loading="auth.cargando" no-caps unelevated rounded />
          </q-form>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from 'src/stores/auth'
import { mensajeError } from 'src/utils/errores'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const tab = ref(route.name === 'registro' ? 'registrar' : 'ingresar')
const mostrar = ref(false)

const login = reactive({ correo: '', contrasena: '' })
const reg = reactive({
  nombres: '',
  apellidos: '',
  tipoDocumento: 'CC',
  numeroDocumento: '',
  correo: '',
  telefono: '',
  contrasena: '',
  confirmarContrasena: '',
})

// Detecta si el correo es institucional SENA (@sena.edu.co).
const esCorreoSena = computed(() => reg.correo.trim().toLowerCase().endsWith('@sena.edu.co'))

async function ingresar() {
  try {
    await auth.login(login.correo, login.contrasena)
    router.push(route.query.redirect || { name: 'panel' })
  } catch (e) {
    mensajeError(e, 'No se pudo iniciar sesión')
  }
}

async function registrar() {
  try {
    await auth.registrar(reg)
    router.push({ name: 'panel' })
  } catch (e) {
    mensajeError(e, 'No se pudo registrar')
  }
}
</script>

<style scoped>
.auth-fondo {
  min-height: 100vh;
  background: linear-gradient(135deg, #39a900 0%, #2d8700 40%, #00324d 100%);
  padding: 16px;
}
.auth-card {
  width: 100%;
  max-width: 460px;
  border-radius: 16px;
}
.logo-circulo {
  width: 52px;
  height: 52px;
  background: #39a900;
  border-radius: 50%;
  color: #fff;
  box-shadow: 0 2px 8px rgba(57, 169, 0, 0.35);
}
.logo-svg { width: 30px; height: 30px; fill: currentColor; }
</style>
