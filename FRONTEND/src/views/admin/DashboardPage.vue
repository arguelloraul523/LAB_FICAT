<template>
  <div>
    <!-- Encabezado -->
    <div class="row items-start q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md">
        <div class="text-caption text-grey-7">{{ fechaLarga() }}</div>
        <h1 class="titulo">{{ saludo() }}, {{ auth.user?.nombres || 'Jefe' }}</h1>
        <div class="text-grey-7">Resumen operativo del laboratorio.</div>
      </div>
      <div class="col-12 col-md-auto row q-gutter-sm">
        <q-btn outline color="secondary" no-caps icon="refresh" label="Actualizar" :loading="dash.cargando" @click="recargar" />
        <q-btn color="primary" no-caps unelevated icon="bar_chart" label="Ver reportes" :to="{ name: 'reportes' }" v-if="auth.rol === 'Administrador'" />
      </div>
    </div>

    <!-- Alerta de retrasos -->
    <q-banner v-if="totalRetrasadas" rounded class="banner-alerta q-mb-lg">
      <template #avatar><q-icon name="warning" color="accent" /></template>
      <strong>{{ totalRetrasadas }}</strong>
      {{ totalRetrasadas === 1 ? 'muestra lleva' : 'muestras llevan' }} {{ dash.diasAlerta }} días o más sin avanzar.
      <template v-if="auth.rol === 'Administrador'" #action>
        <q-btn flat no-caps color="secondary" label="Enviar alertas" :loading="dash.ejecutandoAlerta" @click="enviarAlertas" />
      </template>
    </q-banner>

    <!-- KPIs -->
    <div class="kpis q-mb-lg">
      <div class="kpi">
        <div class="kpi-label">En proceso</div>
        <div class="kpi-valor">{{ dash.enProceso }}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Cola A1 · SENA</div>
        <div class="kpi-valor">{{ dash.cola.A1 }}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Cola A2 · Externos</div>
        <div class="kpi-valor">{{ dash.cola.A2 }}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Pagos por verificar</div>
        <div class="kpi-valor kpi-ambar">{{ dash.pagosPendientes }}</div>
      </div>
    </div>

    <!-- Cola de turnos (ancho completo) -->
    <q-card flat bordered class="card-suave q-mb-lg">
      <q-card-section class="row items-center no-wrap">
        <div>
          <div class="text-h6 text-weight-bold text-secondary">Cola de turnos</div>
          <div class="text-caption text-grey-7">A1 (SENA) antes que A2 · el cliente no se muestra (código ciego)</div>
        </div>
        <q-space />
        <span class="text-caption text-grey-7" v-if="turnos.actualizado">Actualizado {{ horaCorta(turnos.actualizado) }}</span>
      </q-card-section>
      <q-table
        flat
        :rows="filas"
        :columns="columnas"
        row-key="id"
        :loading="turnos.cargando"
        :pagination="{ rowsPerPage: 10 }"
        rows-per-page-label="Filas"
        no-data-label="No hay muestras en cola"
        loading-label="Cargando..."
      >
        <template #body-cell-turno="p">
          <q-td :props="p"><span class="mono text-weight-bold">{{ p.row.turno }}</span></q-td>
        </template>
        <template #body-cell-codigo="p">
          <q-td :props="p"><span class="mono">{{ p.row.codigo }}</span></q-td>
        </template>
        <template #body-cell-prioridad="p">
          <q-td :props="p">
            <q-badge :class="p.row.prioridad === 'A1' ? 'prioridad-a1' : 'prioridad-a2'">{{ p.row.prioridad }}</q-badge>
          </q-td>
        </template>
        <template #body-cell-cliente>
          <q-td><div class="cliente-ciego" aria-label="Cliente oculto" /></q-td>
        </template>
        <template #body-cell-espera="p">
          <q-td :props="p">
            <span :class="p.row.retrasada ? 'espera-ambar' : ''">{{ p.row.espera }}</span>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <div class="row q-col-gutter-lg q-mb-lg">
      <!-- Recaudo -->
      <div class="col-12 col-md-6">
        <q-card flat bordered class="card-suave full-height">
          <q-card-section>
            <div class="text-h6 text-weight-bold text-secondary">Recaudo vs. exonerado</div>
            <div class="text-caption text-grey-7">Mes en curso</div>
          </q-card-section>
          <q-card-section v-if="auth.rol === 'Administrador'">
            <div class="row justify-between q-mb-xs">
              <span>Facturado a externos</span><strong>{{ formatoCOP(dash.facturado) }}</strong>
            </div>
            <div class="barra"><div class="barra-relleno" :style="{ width: dash.pctFacturado + '%' }" /></div>
            <div class="row justify-between q-mt-md q-mb-xs">
              <span>Exonerado SENA</span><strong>{{ formatoCOP(dash.exonerado) }}</strong>
            </div>
            <div class="barra"><div class="barra-relleno barra-navy" :style="{ width: dash.pctExonerado + '%' }" /></div>

            <div class="text-subtitle2 text-weight-bold q-mt-lg q-mb-sm">Clientes por tipología</div>
            <div v-if="!dash.tipologias.length" class="text-grey-7">Sin datos</div>
            <div v-for="t in dash.tipologias" :key="t.label" class="row justify-between q-py-xs">
              <span>{{ t.label }}</span><strong>{{ t.n }}</strong>
            </div>
          </q-card-section>
          <q-card-section v-else class="text-grey-7">Las métricas del mes son de uso exclusivo del Jefe de Laboratorio.</q-card-section>
        </q-card>
      </div>

      <!-- Pagos pendientes -->
      <div class="col-12 col-md-6">
        <q-card flat bordered class="card-suave full-height">
          <q-card-section class="row items-center">
            <div class="text-h6 text-weight-bold text-secondary">Pagos pendientes</div>
            <q-space />
            <q-badge color="accent" text-color="dark" v-if="pagos.total">{{ pagos.total }}</q-badge>
          </q-card-section>
          <q-list separator>
            <q-item v-if="!pagos.filas.length"><q-item-section class="text-grey-7">No hay pagos por verificar.</q-item-section></q-item>
            <q-item v-for="p in pagos.filas" :key="p.id">
              <q-item-section>
                <q-item-label class="mono">{{ p.referencia }}</q-item-label>
                <q-item-label caption>{{ p.metodo }} · hace {{ p.hace }}</q-item-label>
              </q-item-section>
              <q-item-section side class="text-weight-bold text-secondary">{{ formatoCOP(p.valor) }}</q-item-section>
              <q-item-section side>
                <q-btn dense no-caps outline color="primary" label="Revisar" @click="abrirRevision(p)" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>
    </div>

    <!-- Registro auditable -->
    <q-card flat bordered class="card-suave q-mb-lg">
      <q-card-section>
        <div class="text-h6 text-weight-bold text-secondary">Registro auditable</div>
        <div class="text-caption text-grey-7">Últimos movimientos sobre las muestras</div>
      </q-card-section>
      <q-list separator>
        <q-item v-if="!historial.recientes.length"><q-item-section class="text-grey-7">Sin movimientos recientes.</q-item-section></q-item>
        <q-item v-for="e in historial.recientes" :key="e.id">
          <q-item-section side class="mono text-grey-7">{{ e.hora }}</q-item-section>
          <q-item-section>
            <q-item-label>{{ e.texto }}</q-item-label>
            <q-item-label caption v-if="e.detalle">{{ e.detalle }}</q-item-label>
          </q-item-section>
          <q-item-section side class="text-grey-7">{{ e.quien }}</q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <div class="text-caption text-grey-7 text-center">Laboratorio SENA · Datos protegidos con código ciego</div>

    <!-- Revisión de pago -->
    <q-dialog v-model="dialogo">
      <q-card class="card-suave" style="width: 440px; max-width: 94vw">
        <q-card-section class="text-h6 text-weight-bold text-secondary">Revisar pago</q-card-section>
        <q-card-section v-if="sel" class="q-gutter-y-sm">
          <div><span class="text-grey-7">Referencia:</span> <span class="mono">{{ sel.referencia }}</span></div>
          <div><span class="text-grey-7">Método:</span> {{ sel.metodo }}</div>
          <div><span class="text-grey-7">Valor reportado:</span> <strong>{{ formatoCOP(sel.valor) }}</strong></div>
          <div v-if="sel.recibo"><span class="text-grey-7">Recibo de caja:</span> <span class="mono">{{ sel.recibo }}</span></div>
          <div><span class="text-grey-7">Cargado:</span> hace {{ sel.hace }}</div>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat no-caps label="Cerrar" v-close-popup />
          <q-btn outline no-caps color="negative" label="Rechazar" :disable="pagos.verificando" @click="rechazar" />
          <q-btn unelevated no-caps color="primary" label="Aprobar" :loading="pagos.verificando" @click="aprobar" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '@/store/auth'
import { useDashboardStore } from '@/store/dashboard'
import { useTurnosStore } from '@/store/turnos'
import { usePagosStore } from '@/store/pagos'
import { useHistorialStore } from '@/store/historial'
import { formatoCOP, fechaLarga, saludo, horaCorta } from '@/utils/formato'
import { useNotificar } from '@/composables/useNotificar'
import { useConfirmar } from '@/composables/useConfirmar'

const { notificarOk, notificarError, notificarInfo, validacionFallida } = useNotificar()
const { confirmar, pedirTexto } = useConfirmar()

const auth = useAuthStore()
const dash = useDashboardStore()
const turnos = useTurnosStore()
const pagos = usePagosStore()
const historial = useHistorialStore()

const dialogo = ref(false)
const sel = ref(null)

const columnas = [
  { name: 'turno', label: 'Turno', field: 'turno', align: 'left' },
  { name: 'codigo', label: 'Código', field: 'codigo', align: 'left' },
  { name: 'prioridad', label: 'Prioridad', field: 'prioridad', align: 'left' },
  { name: 'cliente', label: 'Cliente', field: 'cliente', align: 'left' },
  { name: 'ensayo', label: 'Ensayo', field: 'ensayo', align: 'left' },
  { name: 'analista', label: 'Responsable', field: 'analista', align: 'left' },
  { name: 'etapa', label: 'Etapa', field: 'etapa', align: 'left' },
  { name: 'espera', label: 'Espera', field: 'espera', align: 'left' },
]

const filas = computed(() => turnos.filas(dash.diasAlerta))
const totalRetrasadas = computed(() => filas.value.filter((f) => f.retrasada).length)

async function recargar() {
  const tareas = [
    dash.cargar(),
    turnos.cargar(),
    pagos.cargarPendientes(4),
    historial.cargar(),
    dash.cargarTipologias(),
  ]
  const res = await Promise.allSettled(tareas)
  const fallo = res.find((r) => r.status === 'rejected')
  if (fallo) notificarError(fallo.reason, 'No se pudo cargar parte del dashboard')
}

async function enviarAlertas() {
  const ok = await confirmar({
    titulo: '¿Enviar alertas de retraso?',
    texto: 'Se notificará a los responsables de las muestras retrasadas.',
    confirmar: 'Enviar',
  })
  if (!ok) return
  try {
    await dash.enviarAlertas()
    notificarOk('Alertas enviadas')
  } catch (e) {
    notificarError(e, 'No se pudieron enviar las alertas')
  }
}

function abrirRevision(p) {
  sel.value = p
  dialogo.value = true
}

async function aprobar() {
  const ok = await confirmar({
    titulo: '¿Aprobar este pago?',
    texto: 'Se generará el cupón verificado para el cliente.',
    confirmar: 'Aprobar',
  })
  if (!ok) return
  try {
    await pagos.verificar(sel.value.id, true)
    notificarOk('Pago aprobado')
    dialogo.value = false
    await Promise.all([pagos.cargarPendientes(4), dash.cargar()])
  } catch (e) {
    notificarError(e, 'No se pudo aprobar el pago')
  }
}

async function rechazar() {
  const motivo = await pedirTexto({
    titulo: 'Rechazar pago',
    texto: 'Indica el motivo para informar al cliente.',
    placeholder: 'Motivo del rechazo',
    confirmar: 'Rechazar',
    obligatorio: true,
    mensajeObligatorio: 'El motivo es obligatorio',
    peligro: true,
  })
  if (motivo === null) return
  try {
    await pagos.verificar(sel.value.id, false, motivo)
    notificarInfo('Pago rechazado')
    dialogo.value = false
    await Promise.all([pagos.cargarPendientes(4), dash.cargar()])
  } catch (e) {
    notificarError(e, 'No se pudo rechazar el pago')
  }
}

onMounted(() => {
  recargar()
  turnos.iniciarPolling(10000)
})
onBeforeUnmount(() => turnos.detener())
</script>

<style scoped>
.titulo { font-size: 30px; font-weight: 800; color: #00324d; margin: 2px 0 4px; line-height: 1.15; }
.banner-alerta { background: #fff4de; color: #7a4b00; border: 1px solid #f5d28a; }

.kpis { display: grid; grid-template-columns: repeat(4, 1fr); background: #00324d; border-radius: 20px; overflow: hidden; }
.kpi { padding: 22px 26px; border-right: 1px solid rgba(255, 255, 255, 0.12); }
.kpi:last-child { border-right: 0; }
.kpi-label { color: #9db2c0; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.kpi-valor { color: #fff; font-size: 38px; font-weight: 800; line-height: 1.2; font-family: 'JetBrains Mono', monospace; }
.kpi-ambar { color: #f5a623; }
@media (max-width: 800px) {
  .kpis { grid-template-columns: repeat(2, 1fr); }
  .kpi { border-bottom: 1px solid rgba(255, 255, 255, 0.12); }
  .titulo { font-size: 24px; }
}

.espera-ambar { color: #b45309; font-weight: 700; }
.barra { height: 10px; border-radius: 6px; background: #eef2f6; overflow: hidden; }
.barra-relleno { height: 100%; background: #39a900; border-radius: 6px; }
.barra-navy { background: #00324d; }
</style>