<template>
  <div>
    <EncabezadoPagina titulo="Mis pagos" icono="payments">
      <template #acciones>
        <q-btn color="primary" icon="add" label="Reportar pago" no-caps @click="abrir" />
      </template>
    </EncabezadoPagina>

    <TablaDatos :filas="filas" :columnas="columnas" :cargando="cargando" mensaje-vacio="No tienes pagos registrados">
      <template #body-cell-estado="props">
        <q-td :props="props"><q-badge :color="colorEstado(props.value)" text-color="white">{{ props.value }}</q-badge></q-td>
      </template>
      <template #body-cell-cupon="props">
        <q-td :props="props">{{ props.row.cupon?.cotizacion?.numeroCotizacion || '—' }}</q-td>
      </template>
      <template #body-cell-valorReportado="props">
        <q-td :props="props">{{ formatoCOP(props.value) }}</q-td>
      </template>
    </TablaDatos>

    <!-- Diálogo reportar pago -->
    <q-dialog v-model="dialogo">
      <q-card style="width: 100%; max-width: 520px">
        <q-card-section>
          <div class="text-h6 text-weight-bold">Reportar pago</div>
        </q-card-section>
        <q-card-section>
          <q-form novalidate @submit="reportar" class="q-gutter-md">
            <q-select v-model="form.cupon" label="Cupón de pago" outlined dense :options="cupones" option-label="codigoReferencia" option-value="_id" emit-value map-options lazy-rules :rules="[val => !!val || 'Obligatorio']" />
            <q-select v-model="form.metodo" label="Método de pago" outlined dense :options="metodos" lazy-rules :rules="[val => !!val || 'Obligatorio']" />
            <q-input v-model="form.valorReportado" type="text" inputmode="numeric" label="Valor reportado" outlined dense lazy-rules :rules="[numeroObligatorio, noNegativo]" />
            <FechaInput v-model="form.fechaPagoReportada" label="Fecha del pago" />
            <q-input v-if="form.metodo === 'Efectivo en caja SENA'" v-model="form.numeroReciboCaja" label="Número de recibo de caja" outlined dense lazy-rules :rules="[val => !!val || 'Obligatorio para efectivo']" />
            <q-file v-else v-model="form.archivoComprobante" label="Comprobante (JPG, PNG o PDF)" outlined dense accept=".jpg,.png,.pdf" lazy-rules :rules="[val => !!val || 'El comprobante es obligatorio']" />
            <div class="row justify-end q-gutter-sm">
              <q-btn flat label="Cancelar" color="grey-7" v-close-popup no-caps />
              <q-btn type="submit" color="primary" label="Enviar" :loading="guardando" no-caps />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import EncabezadoPagina from '@/components/Encabezados/EncabezadoPagina.vue'
import TablaDatos from '@/components/Tables/TablaDatos.vue'
import FechaInput from '@/components/Forms/FechaInput.vue'
import { get, post } from '@/services/api.service'
import { useNotificar } from '@/composables/useNotificar'
// Reglas de Quasar: el navegador no valida nada (sin type=number/date/required).
import { numeroObligatorio, noNegativo } from '@/utils/reglas'

const { notificarOk, notificarError, notificarInfo, validacionFallida } = useNotificar()

const filas = ref([])
const cupones = ref([])
const cargando = ref(false)
const guardando = ref(false)
const dialogo = ref(false)

const metodos = ['Consignación bancaria', 'Transferencia electrónica', 'Efectivo en caja SENA']

const columnas = [
  { name: 'cupon', label: 'Cupón', field: 'cupon', align: 'left' },
  { name: 'metodo', label: 'Método', field: 'metodo', align: 'left' },
  { name: 'valorReportado', label: 'Valor', field: 'valorReportado', align: 'left' },
  { name: 'estado', label: 'Estado', field: 'estado', align: 'left' },
  { name: 'fechaCarga', label: 'Fecha', field: 'fechaCarga', align: 'left', format: (v) => new Date(v).toLocaleDateString('es-CO') },
]

const form = reactive({
  cupon: null,
  metodo: 'Consignación bancaria',
  valorReportado: null,
  fechaPagoReportada: '',
  numeroReciboCaja: '',
  archivoComprobante: null,
})

function formatoCOP(v) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0)
}

function colorEstado(estado) {
  return { 'Pendiente de verificación': 'warning', Pagado: 'positive', Rechazado: 'negative' }[estado] || 'grey-7'
}

async function cargar() {
  cargando.value = true
  try {
    const data = await get('/pagos/mis-pagos')
    filas.value = data.data || []
  } catch (e) {
    notificarError(e, 'No se pudieron cargar los pagos')
  } finally {
    cargando.value = false
  }
}

async function abrir() {
  try {
    const data = await get('/pagos/cupones')
    cupones.value = data.data || []
    if (!cupones.value.length) {
      notificarError('No tienes cupones disponibles para pagar')
      return
    }
    Object.assign(form, { cupon: null, metodo: 'Consignación bancaria', valorReportado: null, fechaPagoReportada: '', numeroReciboCaja: '', archivoComprobante: null })
    dialogo.value = true
  } catch (e) {
    notificarError(e, 'No se pudieron cargar los cupones')
  }
}

async function reportar() {
  guardando.value = true
  try {
    const fd = new FormData()
    fd.append('cupon', form.cupon)
    fd.append('metodo', form.metodo)
    fd.append('valorReportado', form.valorReportado)
    fd.append('fechaPagoReportada', form.fechaPagoReportada)
    if (form.metodo === 'Efectivo en caja SENA') fd.append('numeroReciboCaja', form.numeroReciboCaja)
    else if (form.archivoComprobante) fd.append('archivoComprobante', form.archivoComprobante)

    await post('/pagos', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    notificarOk('Pago reportado')
    dialogo.value = false
    await cargar()
  } catch (e) {
    notificarError(e, 'No se pudo reportar el pago')
  } finally {
    guardando.value = false
  }
}

onMounted(cargar)
</script>