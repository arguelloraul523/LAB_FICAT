<template>
  <div class="auth-fondo row items-center justify-center">
    <q-card class="card-suave q-pa-lg" style="width: 100%; max-width: 420px">
      <q-card-section class="recuperar-header">
        <q-btn
          flat
          dense
          no-caps
          icon="arrow_back"
          label="Volver al acceso"
          color="primary"
          class="btn-volver"
          @click="router.push({ name: 'login' })"
        />
        <div class="text-center">
          <q-icon name="lock_reset" color="primary" size="3em" />
          <div class="text-h5 text-weight-bold q-mt-sm">Recuperar contraseña</div>
          <div class="text-caption text-grey-7 q-mt-xs">Paso {{ paso }} de 3</div>
        </div>
      </q-card-section>

      <!-- Paso 1: solicitar código -->
      <q-card-section v-if="paso === 1">
        <div class="text-caption text-grey-7 q-mb-md">
          Escribe tu correo y te enviaremos un código de verificación.
        </div>
        <!-- Correo no registrado: aviso + invitación a crear cuenta -->
        <q-banner v-if="correoNoExiste" class="bg-red-1 text-red-8 q-mb-md" rounded dense>
          <div class="text-body2">
            No existe una cuenta con ese correo. Si aún no tienes cuenta,
            <strong>regístrate</strong> para poder recuperar tu contraseña.
          </div>
          <template #action>
            <q-btn flat color="primary" label="Ir a registro" no-caps :to="{ name: 'registro' }" />
            <q-btn flat color="grey-7" label="Corregir correo" no-caps @click="correoNoExiste = false" />
          </template>
        </q-banner>
        <q-form novalidate @submit="solicitar" class="q-gutter-md">
          <q-input v-model="correo" type="text" inputmode="email" label="Correo electrónico" outlined dense lazy-rules :rules="[obligatorio('El correo es obligatorio'), reglaCorreo]">
            <template #prepend><q-icon name="mail" /></template>
          </q-input>
          <q-btn type="submit" color="primary" label="Enviar código" class="full-width" :loading="cargando" no-caps />
        </q-form>
      </q-card-section>

      <!-- Paso 2: verificar el código de 6 dígitos -->
      <q-card-section v-else-if="paso === 2">
        <div class="text-caption text-grey-7 q-mb-md">
          Enviamos un código de 6 dígitos a <strong>{{ correo }}</strong>. Válido por 10 minutos.
        </div>
        <q-form novalidate @submit="verificar" class="q-gutter-md">
          <q-input
            v-model="codigo"
            type="text"
            inputmode="numeric"
            maxlength="6"
            label="Código de verificación"
            outlined
            dense
            lazy-rules
            class="text-center"
            style="font-size: 1.4em; letter-spacing: 8px"
            :rules="[val => /^\d{6}$/.test(val || '') || 'El código tiene 6 dígitos']"
          >
            <template #prepend><q-icon name="pin" /></template>
          </q-input>
          <q-btn type="submit" color="primary" label="Verificar código" class="full-width" :loading="cargando" no-caps />
          <q-btn flat color="primary" label="Reenviar código" class="full-width" :disable="cargando" no-caps @click="reenviar" />
          <q-btn flat dense color="grey-7" label="Cambiar correo" class="full-width" no-caps @click="paso = 1" />
        </q-form>
      </q-card-section>

      <!-- Paso 3: nueva contraseña (solo con token emitido tras verificar el código) -->
      <q-card-section v-else>
        <div class="text-caption text-grey-7 q-mb-md">Ingresa tu nueva contraseña.</div>
        <q-form novalidate @submit="restablecer" class="q-gutter-md">
          <q-input v-model="contrasenaNueva" :type="mostrar ? 'text' : 'password'" label="Nueva contraseña (mínimo 6)" outlined dense lazy-rules :rules="[val => (val && val.length >= 6) || 'Mínimo 6 caracteres']" />
          <q-input v-model="confirmarContrasena" :type="mostrar ? 'text' : 'password'" label="Confirmar contraseña" outlined dense lazy-rules :rules="[val => val === contrasenaNueva || 'No coinciden']">
            <template #append>
              <q-icon :name="mostrar ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="mostrar = !mostrar" />
            </template>
          </q-input>
          <q-btn type="submit" color="primary" label="Restablecer contraseña" class="full-width" :loading="cargando" no-caps />
        </q-form>
      </q-card-section>

      <q-card-section class="text-center text-caption text-grey-7">
        <router-link to="/login" class="text-sena">Volver al inicio de sesión</router-link>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { post } from '@/services/api.service'
import { useNotificar } from '@/composables/useNotificar'
// Reglas de Quasar: el navegador no valida nada (sin type=email/required).
import { obligatorio, correo as reglaCorreo } from '@/utils/reglas'

const { notificarOk, notificarError } = useNotificar()

const router = useRouter()

// Flujo en 3 pasos: correo -> código de 6 dígitos -> contraseña nueva.
// El token de restablecimiento solo llega desde /auth/verificar-codigo
// (el backend lo emite tras comprobar el código enviado por correo).
const paso = ref(1)
const correo = ref('')
const codigo = ref('')
const token = ref('')
const contrasenaNueva = ref('')
const confirmarContrasena = ref('')
const mostrar = ref(false)
const cargando = ref(false)
// true = el backend respondió CORREO_NO_REGISTRADO (404) en el paso 1.
const correoNoExiste = ref(false)

async function solicitar() {
  cargando.value = true
  correoNoExiste.value = false
  try {
    const data = await post('/auth/olvide-contrasena', { correo: correo.value })
    notificarOk(data.mensaje || 'Código de verificación enviado a tu correo')
    codigo.value = ''
    paso.value = 2
  } catch (e) {
    if (e?.codigo === 'CORREO_NO_REGISTRADO') {
      // Aviso en la tarjeta con botón "Ir a registro" (no se avanza de paso).
      correoNoExiste.value = true
    } else {
      // 503 (sin SMTP configurado) u otro error: se queda en el paso 1.
      notificarError(e)
    }
  } finally {
    cargando.value = false
  }
}

async function reenviar() {
  await solicitar()
}

async function verificar() {
  cargando.value = true
  try {
    const data = await post('/auth/verificar-codigo', {
      correo: correo.value,
      codigo: codigo.value,
    })
    token.value = data.data?.token || ''
    if (!token.value) throw new Error('Respuesta inválida del servidor')
    notificarOk(data.mensaje || 'Código verificado')
    contrasenaNueva.value = ''
    confirmarContrasena.value = ''
    paso.value = 3
  } catch (e) {
    notificarError(e)
  } finally {
    cargando.value = false
  }
}

async function restablecer() {
  cargando.value = true
  try {
    await post('/auth/restablecer-contrasena', {
      token: token.value,
      contrasenaNueva: contrasenaNueva.value,
      confirmarContrasena: confirmarContrasena.value,
    })
    notificarOk('Contraseña restablecida. Inicia sesión.')
    router.push({ name: 'login' })
  } catch (e) {
    notificarError(e)
  } finally {
    cargando.value = false
  }
}
</script>

<style scoped>
.auth-fondo {
  min-height: 100vh;
  background: linear-gradient(135deg, #39a900 0%, #2d8700 40%, #00324d 100%);
  padding: 16px;
}

.recuperar-header {
  padding-bottom: 8px;
}

.btn-volver {
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
}
</style>
