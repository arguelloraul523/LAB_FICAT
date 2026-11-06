<template>
  <div>
    <div class="text-h5 text-weight-bold q-mb-md">Mi perfil</div>

    <!-- Resumen -->
    <q-card class="card-suave q-pa-md q-mb-md" flat bordered>
      <div class="row items-center q-gutter-md">
        <q-avatar size="64px" color="primary" text-color="white" icon="person" />
        <div>
          <div class="text-h6">{{ auth.nombres || 'Sin nombre' }}</div>
          <div class="text-caption text-grey-7">{{ auth.correo }}</div>
          <div class="q-mt-xs">
            <q-badge :color="auth.rol === 'Administrador' ? 'primary' : 'secondary'" text-color="white">
              {{ auth.rol }}
            </q-badge>
            <q-badge
              v-if="auth.rol === 'Cliente'"
              :color="auth.esSena ? 'accent' : 'grey-7'"
              :text-color="auth.esSena ? 'dark' : 'white'"
              class="q-ml-xs"
            >
              {{ auth.esSena ? 'SENA (sin cobro)' : 'Externo (con cobro)' }}
            </q-badge>
          </div>
        </div>
      </div>
    </q-card>

    <!-- Datos personales -->
    <q-card class="card-suave q-pa-md q-mb-md" flat bordered>
      <div class="text-subtitle1 text-weight-bold q-mb-md">Datos personales</div>
      <q-form @submit="guardar" class="q-gutter-md">
        <div class="row q-col-gutter-md">
          <q-input v-model="form.nombres" label="Nombres" outlined dense class="col-6" lazy-rules :rules="[v => !!v || 'Obligatorio']" />
          <q-input v-model="form.apellidos" label="Apellidos" outlined dense class="col-6" lazy-rules :rules="[v => !!v || 'Obligatorio']" />
        </div>
        <q-input v-model="form.telefono" label="Teléfono / celular" outlined dense />
        <q-input v-model="form.razonSocial" label="Razón social / empresa (opcional)" outlined dense />
        <q-input v-model="form.direccion" label="Dirección" outlined dense />
        <div class="row q-col-gutter-md">
          <q-input v-model="form.ciudad" label="Ciudad" outlined dense class="col-6" />
          <q-input v-model="form.departamento" label="Departamento" outlined dense class="col-6" />
        </div>
        <div class="row q-col-gutter-md">
          <q-input v-model="form.cargo" label="Cargo" outlined dense class="col-6" />
          <q-input v-model="form.personaContacto" label="Persona de contacto" outlined dense class="col-6" />
        </div>
        <q-select
          v-if="auth.rol === 'Cliente'"
          v-model="form.tipologia"
          label="Clasificación / Tipología"
          outlined
          dense
          :options="tipologias"
          option-label="nombre"
          option-value="_id"
          emit-value
          map-options
        />
        <div class="row justify-end">
          <q-btn type="submit" color="primary" label="Guardar cambios" :loading="guardando" no-caps />
        </div>
      </q-form>
    </q-card>

    <!-- Cambiar contraseña -->
    <q-card class="card-suave q-pa-md" flat bordered>
      <div class="text-subtitle1 text-weight-bold q-mb-md">Cambiar contraseña</div>
      <q-form @submit="cambiarContrasena" class="q-gutter-md">
        <q-input v-model="passw.actual" :type="ver ? 'text' : 'password'" label="Contraseña actual" outlined dense lazy-rules :rules="[v => !!v || 'Obligatorio']">
          <template #append><q-icon :name="ver ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="ver = !ver" /></template>
        </q-input>
        <q-input v-model="passw.nueva" :type="ver ? 'text' : 'password'" label="Nueva contraseña (mínimo 6)" outlined dense lazy-rules :rules="[v => (v && v.length >= 6) || 'Mínimo 6 caracteres']" />
        <q-input v-model="passw.confirmar" :type="ver ? 'text' : 'password'" label="Confirmar nueva contraseña" outlined dense lazy-rules :rules="[v => v === passw.nueva || 'No coinciden']" />
        <div class="row justify-end">
          <q-btn type="submit" color="secondary" label="Cambiar contraseña" :loading="guardandoPass" no-caps />
        </div>
      </q-form>
    </q-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { api } from 'src/boot/axios'
import { useAuthStore } from 'src/stores/auth'
import { mensajeError, mensajeOk } from 'src/utils/errores'

const auth = useAuthStore()
const guardando = ref(false)
const guardandoPass = ref(false)
const ver = ref(false)
const tipologias = ref([])

const form = reactive({
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

const passw = reactive({ actual: '', nueva: '', confirmar: '' })

function cargarForm() {
  const u = auth.user || {}
  Object.assign(form, {
    nombres: u.nombres || '',
    apellidos: u.apellidos || '',
    telefono: u.telefono || '',
    razonSocial: u.razonSocial || '',
    direccion: u.direccion || '',
    ciudad: u.ciudad || '',
    departamento: u.departamento || '',
    cargo: u.cargo || '',
    personaContacto: u.personaContacto || '',
    tipologia: u.tipologia?._id || u.tipologia || null,
  })
}

async function cargarTipologias() {
  try {
    const { data } = await api.get('/configuracion/tipologias')
    tipologias.value = data.data || []
  } catch (e) {
    /* no crítico */
  }
}

async function guardar() {
  guardando.value = true
  try {
    await api.put('/auth/perfil', form)
    await auth.cargarPerfil()
    mensajeOk('Perfil actualizado')
  } catch (e) {
    mensajeError(e, 'No se pudo actualizar el perfil')
  } finally {
    guardando.value = false
  }
}

async function cambiarContrasena() {
  guardandoPass.value = true
  try {
    await api.put('/auth/cambiar-contrasena', {
      contrasenaActual: passw.actual,
      contrasenaNueva: passw.nueva,
      confirmarContrasena: passw.confirmar,
    })
    mensajeOk('Contraseña actualizada')
    Object.assign(passw, { actual: '', nueva: '', confirmar: '' })
  } catch (e) {
    mensajeError(e, 'No se pudo cambiar la contraseña')
  } finally {
    guardandoPass.value = false
  }
}

onMounted(() => {
  cargarForm()
  if (auth.rol === 'Cliente') cargarTipologias()
})
</script>
