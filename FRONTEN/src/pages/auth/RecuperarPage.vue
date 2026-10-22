<template>
  <div class="auth-fondo row items-center justify-center">
    <q-card class="card-suave q-pa-lg" style="width: 100%; max-width: 420px">
      <q-card-section class="text-center">
        <q-icon name="lock_reset" color="primary" size="3em" />
        <div class="text-h5 text-weight-bold q-mt-sm">Recuperar contraseña</div>
      </q-card-section>

      <!-- Paso 1: solicitar enlace -->
      <q-card-section v-if="!token">
        <div class="text-caption text-grey-7 q-mb-md">
          Escribe tu correo y te enviaremos un enlace para restablecer tu contraseña.
        </div>
        <q-form @submit="solicitar" class="q-gutter-md">
          <q-input v-model="correo" type="email" label="Correo electrónico" outlined dense lazy-rules :rules="[val => !!val || 'El correo es obligatorio']">
            <template #prepend><q-icon name="mail" /></template>
          </q-input>
          <q-btn type="submit" color="primary" label="Enviar enlace" class="full-width" :loading="cargando" no-caps />
        </q-form>
      </q-card-section>

      <!-- Paso 2: restablecer con el token -->
      <q-card-section v-else>
        <div class="text-caption text-grey-7 q-mb-md">Ingresa tu nueva contraseña.</div>
        <q-form @submit="restablecer" class="q-gutter-md">
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
import { useRoute, useRouter } from 'vue-router'
import { api } from 'src/boot/axios'
import { mensajeError, mensajeOk } from 'src/utils/errores'

const route = useRoute()
const router = useRouter()

const token = ref(route.query.token || '')
const correo = ref('')
const contrasenaNueva = ref('')
const confirmarContrasena = ref('')
const mostrar = ref(false)
const cargando = ref(false)

async function solicitar() {
  cargando.value = true
  try {
    const { data } = await api.post('/auth/olvide-contrasena', { correo: correo.value })
    // En desarrollo sin SMTP el backend devuelve el enlace; si llega, lo usamos.
    if (data.enlace) {
      const url = new URL(data.enlace)
      token.value = url.searchParams.get('token') || ''
    }
    mensajeOk(data.mensaje || 'Si el correo existe, recibirás instrucciones')
  } catch (e) {
    mensajeError(e)
  } finally {
    cargando.value = false
  }
}

async function restablecer() {
  cargando.value = true
  try {
    await api.post('/auth/restablecer-contrasena', {
      token: token.value,
      contrasenaNueva: contrasenaNueva.value,
      confirmarContrasena: confirmarContrasena.value,
    })
    mensajeOk('Contraseña restablecida. Inicia sesión.')
    router.push({ name: 'login' })
  } catch (e) {
    mensajeError(e)
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
</style>
