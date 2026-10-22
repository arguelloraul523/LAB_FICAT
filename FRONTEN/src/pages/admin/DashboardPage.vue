<template>
  <div>
    <div class="text-h6 text-weight-bold q-mb-md">Dashboard del laboratorio</div>

    <div class="row q-col-gutter-md q-mb-md">
      <q-card class="col-6 col-md-3 card-suave">
        <q-card-section>
          <div class="text-caption text-grey-7">Pagos pendientes</div>
          <div class="text-h4 text-weight-bold text-warning">{{ dashboard.pagosPendientes }}</div>
        </q-card-section>
      </q-card>
      <q-card class="col-6 col-md-3 card-suave">
        <q-card-section>
          <div class="text-caption text-grey-7">Cola A1 (SENA)</div>
          <div class="text-h4 text-weight-bold text-sena">{{ dashboard.cola.A1 }}</div>
        </q-card-section>
      </q-card>
      <q-card class="col-6 col-md-3 card-suave">
        <q-card-section>
          <div class="text-caption text-grey-7">Cola A2 (externo)</div>
          <div class="text-h4 text-weight-bold text-grey-7">{{ dashboard.cola.A2 }}</div>
        </q-card-section>
      </q-card>
      <q-card class="col-6 col-md-3 card-suave">
        <q-card-section>
          <div class="text-caption text-grey-7">Recaudo</div>
          <div class="text-h5 text-weight-bold text-positive">{{ formatoCOP(dashboard.recaudo.total) }}</div>
          <div class="text-caption text-grey-7">{{ dashboard.recaudo.pagosAprobados }} pagos aprobados</div>
        </q-card-section>
      </q-card>
    </div>

    <div class="row q-col-gutter-md">
      <q-card class="col-12 col-md-6 card-suave">
        <q-card-section>
          <div class="text-subtitle1 text-weight-bold q-mb-sm">Muestras por etapa</div>
          <q-list dense>
            <q-item v-for="(cant, etapa) in dashboard.muestrasPorEtapa" :key="etapa" class="q-px-none">
              <q-item-section>{{ etapa }}</q-item-section>
              <q-item-section side><q-badge color="primary" text-color="white">{{ cant }}</q-badge></q-item-section>
            </q-item>
          </q-list>
          <div v-if="!Object.keys(dashboard.muestrasPorEtapa).length" class="text-caption text-grey-6">Sin datos</div>
        </q-card-section>
      </q-card>

      <q-card class="col-12 col-md-6 card-suave">
        <q-card-section>
          <div class="text-subtitle1 text-weight-bold q-mb-sm">Alertas de retraso</div>
          <q-list dense>
            <q-item class="q-px-none"><q-item-section>Muestras retrasadas</q-item-section><q-item-section side><q-badge color="warning">{{ dashboard.alertas.muestrasRetrasadas ?? 0 }}</q-badge></q-item-section></q-item>
            <q-item class="q-px-none"><q-item-section>Cupones retrasados</q-item-section><q-item-section side><q-badge color="warning">{{ dashboard.alertas.cuponesRetrasados ?? 0 }}</q-badge></q-item-section></q-item>
            <q-item class="q-px-none"><q-item-section>Notificaciones no leídas</q-item-section><q-item-section side><q-badge color="info">{{ dashboard.alertas.notificacionesNoLeidas ?? 0 }}</q-badge></q-item-section></q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useDashboardStore } from 'src/stores/dashboard'
import { mensajeError } from 'src/utils/errores'

const dashboard = useDashboardStore()

function formatoCOP(v) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0)
}

async function cargar() {
  try {
    await dashboard.cargar()
  } catch (e) {
    mensajeError(e, 'No se pudo cargar el dashboard')
  }
}

onMounted(cargar)
</script>
