import express from 'express';
const router = express.Router();
import { ejecutar } from '../controllers/cron.controller.js';
import { autorizarCron } from '../middlewares/cronSecret.middleware.js';

// Disparo externo del cron (Render Cron Jobs / cron-job.org).
// Protegido por x-cron-secret (no por JWT): el disparador no tiene sesión.
router.post('/retrasos', autorizarCron, ejecutar);

export default router;
