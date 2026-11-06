<template>
  <div class="auth-fondo">
    <div class="auth-card">
      <button type="button" class="btn-volver" @click="volver">← Volver al inicio</button>

      <!-- Logo -->
      <div class="logo-section">
        <div class="logo-circulo">
          <svg viewBox="0 0 24 24" class="logo-svg">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <div class="titulo">LABFICAT</div>
        <div class="subtitulo">Laboratorio de Caracterización Fisicoquímica de Alimentos</div>
      </div>

      <!-- Selector Ingresar / Registrar -->
      <div class="toggle">
        <button type="button" class="toggle-btn" :class="{ activo: tab === 'ingresar' }" @click="tab = 'ingresar'">Ingresar</button>
        <button type="button" class="toggle-btn" :class="{ activo: tab === 'registrar' }" @click="tab = 'registrar'">Registrar</button>
      </div>

      <!-- ===== INGRESAR ===== -->
      <form v-if="tab === 'ingresar'" class="form" @submit.prevent="ingresar">
        <label class="campo">
          <span>Correo electrónico</span>
          <input v-model="login.correo" type="email" placeholder="tucorreo@ejemplo.com" required />
        </label>
        <label class="campo">
          <span>Contraseña</span>
          <input v-model="login.contrasena" :type="mostrar ? 'text' : 'password'" placeholder="Tu contraseña" required />
        </label>
        <div class="row-fila">
          <button type="submit" class="btn-submit">Iniciar sesión</button>
        </div>
      </form>

      <!-- ===== REGISTRAR ===== -->
      <form v-else class="form" @submit.prevent="registrar">
        <label class="campo">
          <span>Correo electrónico</span>
          <input v-model="reg.correo" type="email" placeholder="tucorreo@ejemplo.com" required />
        </label>
        <div v-if="esCorreoSena" class="aviso-sena">✅ Correo <b>@sena.edu.co</b> detectado: podrás solicitar verificación SENA para prioridad A1 y cotización $0.</div>

        <div class="row-2">
          <label class="campo">
            <span>Nombres</span>
            <input v-model="reg.nombres" type="text" placeholder="Nombres" required />
          </label>
          <label class="campo">
            <span>Apellidos</span>
            <input v-model="reg.apellidos" type="text" placeholder="Apellidos" required />
          </label>
        </div>

        <div class="row-2">
          <label class="campo">
            <span>Tipo de documento</span>
            <select v-model="reg.tipoDocumento">
              <option value="CC">CC</option>
              <option value="TI">TI</option>
              <option value="CE">CE</option>
              <option value="NIT">NIT</option>
            </select>
          </label>
          <label class="campo">
            <span>Número de documento / NIT</span>
            <input v-model="reg.numeroDocumento" type="text" placeholder="Documento" required />
          </label>
        </div>

        <label class="campo">
          <span>Teléfono / celular</span>
          <input v-model="reg.telefono" type="tel" placeholder="3000000000" required />
        </label>

        <label class="campo">
          <span>Razón social / empresa (opcional)</span>
          <input v-model="reg.razonSocial" type="text" placeholder="Nombre de la empresa" />
        </label>
        <label class="campo">
          <span>Dirección (opcional)</span>
          <input v-model="reg.direccion" type="text" placeholder="Dirección" />
        </label>
        <div class="row-2">
          <label class="campo">
            <span>Ciudad (opcional)</span>
            <input v-model="reg.ciudad" type="text" placeholder="Ciudad" />
          </label>
          <label class="campo">
            <span>Departamento (opcional)</span>
            <input v-model="reg.departamento" type="text" placeholder="Departamento" />
          </label>
        </div>
        <div class="row-2">
          <label class="campo">
            <span>Cargo (opcional)</span>
            <input v-model="reg.cargo" type="text" placeholder="Cargo" />
          </label>
          <label class="campo">
            <span>Persona de contacto (opcional)</span>
            <input v-model="reg.personaContacto" type="text" placeholder="Contacto" />
          </label>
        </div>

        <label class="campo">
          <span>Contraseña (mínimo 6)</span>
          <input v-model="reg.contrasena" :type="mostrar ? 'text' : 'password'" placeholder="Contraseña" required minlength="6" />
        </label>
        <label class="campo">
          <span>Confirmar contraseña</span>
          <input v-model="reg.confirmarContrasena" :type="mostrar ? 'text' : 'password'" placeholder="Repite la contraseña" required />
        </label>

        <label class="check">
          <input v-model="mostrar" type="checkbox" /> Mostrar contraseñas
        </label>

        <div class="row-fila">
          <button type="submit" class="btn-submit">Crear cuenta</button>
        </div>
      </form>
    </div>
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
  razonSocial: '',
  direccion: '',
  ciudad: '',
  departamento: '',
  cargo: '',
  personaContacto: '',
  contrasena: '',
  confirmarContrasena: '',
})

// Detecta si el correo es institucional SENA (@sena.edu.co).
const esCorreoSena = computed(() => reg.correo.trim().toLowerCase().endsWith('@sena.edu.co'))

function volver() {
  router.push({ name: 'inicio' })
}

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
  padding: 24px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.auth-card {
  width: 100%;
  max-width: 460px;
  background: #fff;
  border-radius: 16px;
  padding: 24px 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
}
.btn-volver {
  background: none;
  border: none;
  color: #00324d;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  margin-bottom: 8px;
}
.btn-volver:hover { color: #39a900; }
.logo-section {
  text-align: center;
  margin-bottom: 16px;
}
.logo-circulo {
  width: 52px;
  height: 52px;
  background: #39a900;
  border-radius: 50%;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}
.logo-svg { width: 28px; height: 28px; fill: currentColor; }
.titulo { font-size: 1.3rem; font-weight: 700; color: #00324d; }
.subtitulo { font-size: 0.8rem; color: #757575; margin-top: 2px; }

.toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.toggle-btn {
  flex: 1;
  padding: 10px;
  border: 1px solid #39a900;
  background: #fff;
  color: #39a900;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}
.toggle-btn.activo {
  background: #39a900;
  color: #fff;
}

.form { display: flex; flex-direction: column; gap: 12px; }
.campo { display: flex; flex-direction: column; gap: 4px; }
.campo span { font-size: 0.8rem; color: #555; }
.campo input,
.campo select {
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 0.95rem;
  outline: none;
}
.campo input:focus,
.campo select:focus { border-color: #39a900; }
.row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.row-fila { display: flex; }
.btn-submit {
  flex: 1;
  padding: 12px;
  background: #39a900;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}
.btn-submit:hover { background: #2d8700; }
.aviso-sena {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 10px;
  border-radius: 8px;
  font-size: 0.8rem;
}
.check { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: #555; }
</style>
