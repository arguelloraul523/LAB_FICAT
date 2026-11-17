import asyncHandler from '../utils/asyncHandler.js';
import crudFactory from '../utils/crudFactory.js';
import { crearRechazo, decidirRechazo } from '../services/rechazos.service.js';
import { esCliente } from '../middlewares/propietario.middleware.js';
import MotivoRechazo from '../models/MotivoRechazo.js';
import Rechazo from '../models/Rechazo.js';

// ===== Catálogo de motivos parametrizados (RF-20) =====
// Solo la administración modifica el catálogo; el rechazo solo puede
// usar motivos de esta lista (regla inviolable #7).
const motivos = crudFactory(MotivoRechazo);

// ===== Rechazos (RF-20) =====
const rechazos = {
  ...crudFactory(Rechazo, ['muestra', 'motivo', 'registradoPor']),
  // Crear un rechazo: motivo del catálogo obligatorio, evidencia opcional,
  // acta PDF generada por el servidor, muestra -> Rechazada + etapa Cancelada
  // y notificación al cliente con su decisión Reenviar/Recoger.
  crear: asyncHandler(async (req, res) => {
    const { rechazo, muestra } = await crearRechazo({
      body: req.body,
      // La evidencia llega por multer y la ruta la mapea a req.body.evidenciaFoto.
      evidenciaFoto: req.body.evidenciaFoto || null,
      usuario: req.usuario,
    });
    res.status(201).json({ ok: true, data: rechazo, muestra });
  }),
  // Decisión del cliente tras el rechazo: Reenviar o Recoger (RF-20)
  decidir: asyncHandler(async (req, res) => {
    const rechazo = await decidirRechazo({
      id: req.params.id,
      decision: req.body.decision,
      usuario: req.usuario,
      esCliente: esCliente(req),
    });
    res.json({ ok: true, data: rechazo });
  }),
};

export { motivos, rechazos };
