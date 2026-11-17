import asyncHandler from '../utils/asyncHandler.js';
import { ejecutarAlertasRetraso } from '../services/cron.service.js';
import { drenarCorreosPendientes } from '../services/colaNotificaciones.service.js';

// ============================================================
// Disparo externo del cron (Render Cron Jobs / cron-job.org).
// En Render free la app "duerme" por inactividad y el cron en proceso
// (`node-cron`) no se ejecuta de forma fiable. Un servicio externo llama
// a este endpoint (protegido por x-cron-secret) para:
//   1. ejecutar las alertas de retraso (RF-32), y
//   2. drenar los correos pendientes persistidos (RNF-09).
// ============================================================
const ejecutar = asyncHandler(async (req, res) => {
  const [alertas, correos] = await Promise.all([
    ejecutarAlertasRetraso(),
    drenarCorreosPendientes(),
  ]);
  res.json({ ok: true, data: { alertas, correos } });
});

export { ejecutar };
