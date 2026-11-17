import asyncHandler from '../utils/asyncHandler.js';
import crudConAuditoria from '../utils/crudConAuditoria.js';
import PlantillaMensaje from '../models/PlantillaMensaje.js';
import OpcionAsistenteIA from '../models/OpcionAsistenteIA.js';
import ParametroSistema from '../models/ParametroSistema.js';
import TipologiaCliente from '../models/TipologiaCliente.js';
import AuditoriaConfiguracion from '../models/AuditoriaConfiguracion.js';
import { ejecutarAlertasRetraso } from '../services/cron.service.js';

// Configuración del sistema con auditoría (RF-27/RF-31): plantillas,
// opciones del asistente IA, parámetros globales y tipologías de cliente.
const plantillas = crudConAuditoria(PlantillaMensaje, {
  entidad: 'PlantillaMensaje',
  populate: ['modificadoPor'],
});
const opcionesIA = crudConAuditoria(OpcionAsistenteIA, {
  entidad: 'OpcionAsistenteIA',
  populate: ['modificadoPor'],
});
const parametros = crudConAuditoria(ParametroSistema, {
  entidad: 'ParametroSistema',
  populate: ['modificadoPor'],
});
const tipologias = crudConAuditoria(TipologiaCliente, { entidad: 'TipologiaCliente' });

// Disparo manual de las alertas de retraso (RF-32), útil para verificar sin
// esperar la expresión cron. Solo Administrador.
const alertas = {
  ejecutar: asyncHandler(async (req, res) => {
    const resultado = await ejecutarAlertasRetraso();
    res.json({ ok: true, data: resultado });
  }),
};

// Auditoría de configuración: quién cambió qué (más reciente primero).
const auditoria = {
  listar: asyncHandler(async (req, res) => {
    const limite = Math.min(Number(req.query.limite) || 100, 500);
    const filtro = {};
    if (req.query.entidad) filtro.entidad = req.query.entidad;
    const data = await AuditoriaConfiguracion.find(filtro)
      .sort({ fecha: -1 })
      .limit(limite)
      .populate('usuario', 'nombres apellidos correo');
    res.json({ ok: true, total: data.length, data });
  }),
};

export { plantillas, opcionesIA, parametros, tipologias, alertas, auditoria };
