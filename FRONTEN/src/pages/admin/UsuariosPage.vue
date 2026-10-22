<template>
  <div>
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h6 text-weight-bold">Usuarios</div>
      <q-btn color="primary" icon="add" label="Nuevo usuario" no-caps @click="abrir" />
    </div>

    <q-table :rows="filas" :columns="columnas" row-key="_id" :loading="cargando" flat bordered class="card-suave">
      <template #body-cell-activo="props">
        <q-td :props="props"><q-badge :color="props.value ? 'positive' : 'negative'" text-color="white">{{ props.value ? 'Activo' : 'Inactivo' }}</q-badge></q-td>
      </template>
      <template #body-cell-tipoUsuario="props">
        <q-td :props="props"><span :class="props.value === 'SENA' ? 'prioridad-a1' : 'prioridad-a2'">{{ props.value }}</span></q-td>
      </template>
    </q-table>

    <q-dialog v-model="dialogo">
      <q-card style="width: 100%; max-width: 520px">
        <q-card-section><div class="text-h6 text-weight-bold">Nuevo usuario</div></q-card-section>
        <q-card-section>
          <q-form @submit="crear" class="q-gutter-md">
            <div class="row q-col-gutter-md">
              <q-input v-model="form.nombres" label="Nombres" outlined dense class="col-6" lazy-rules :rules="[val => !!val || 'Obligatorio']" />
              <q-input v-model="form.apellidos" label="Apellidos" outlined dense class="col-6" lazy-rules :rules="[val => !!val || 'Obligatorio']" />
            </div>
            <q-input v-model="form.correo" type="email" label="Correo" outlined dense lazy-rules :rules="[val => !!val || 'Obligatorio']" />
            <q-select v-model="form.rol" label="Rol" outlined dense :options="roles" option-label="nombre" option-value="_id" emit-value map-options lazy-rules :rules="[val => !!val || 'Obligatorio']" />
            <q-select v-model="form.tipoUsuario" label="Tipo de usuario" outlined dense :options="['EXTERNO', 'SENA']" lazy-rules :rules="[val => !!val || 'Obligatorio']" />
            <q-input v-model="form.contrasena" type="password" label="Contraseña" outlined dense lazy-rules :rules="[val => (val && val.length >= 6) || 'Mínimo 6 caracteres']" />
            <div class="row justify-end q-gutter-sm">
              <q-btn flat label="Cancelar" color="grey-7" v-close-popup no-caps />
              <q-btn type="submit" color="primary" label="Crear" :loading="guardando" no-caps />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { api } from 'src/boot/axios'
import { mensajeError, mensajeOk } from 'src/utils/errores'

const filas = ref([])
const roles = ref([])
const cargando = ref(false)
const guardando = ref(false)
const dialogo = ref(false)

const columnas = [
  { name: 'nombres', label: 'Nombre', field: (r) => `${r.nombres} ${r.apellidos}`, align: 'left' },
  { name: 'correo', label: 'Correo', field: 'correo', align: 'left' },
  { name: 'tipoUsuario', label: 'Tipo', field: 'tipoUsuario', align: 'left' },
  { name: 'activo', label: 'Estado', field: 'activo', align: 'left' },
]

const form = reactive({ nombres: '', apellidos: '', correo: '', rol: null, tipoUsuario: 'EXTERNO', contrasena: '' })

async function cargar() {
  cargando.value = true
  try {
    const [{ data: u }, { data: r }] = await Promise.all([api.get('/usuarios'), api.get('/roles')])
    filas.value = u.data || []
    roles.value = r.data || []
  } catch (e) {
    mensajeError(e, 'No se pudieron cargar los usuarios')
  } finally {
    cargando.value = false
  }
}

function abrir() {
  Object.assign(form, { nombres: '', apellidos: '', correo: '', rol: null, tipoUsuario: 'EXTERNO', contrasena: '' })
  dialogo.value = true
}

async function crear() {
  guardando.value = true
  try {
    await api.post('/usuarios', form)
    mensajeOk('Usuario creado')
    dialogo.value = false
    await cargar()
  } catch (e) {
    mensajeError(e, 'No se pudo crear el usuario')
  } finally {
    guardando.value = false
  }
}

onMounted(cargar)
</script>
