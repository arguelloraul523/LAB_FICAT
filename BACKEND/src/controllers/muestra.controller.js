import asyncHandler from '../utils/asyncHandler.js';
import crudFactory from '../utils/crudFactory.js';
import {
  buscarRecepcion,
  crearMuestra,
  colaAtencion,
  cambiarEtapaMuestra,
  asignarAnalista,
  reabrirMuestra,
  datosCliente,
  POBLAR_EXAMEN,
} from '../services/muestras.service.js';
import { ANCHOS_ROTULO, htmlRotulo, htmlHojaTrabajo } from '../services/rotulo.service.js';
import { dtoTecnico, PARAMETROS_EXAMEN } from '../services/blindaje.service.js';
import { esAnalista } from '../middlewares/propietario.middleware.js';
import Muestra from '../models/Muestra.js';
import HistorialMuestra from '../models/HistorialMuestra.js';

// ===== Muestras / recepción (RF-09, RF-17 a RF-21) =====
// La lógica de negocio vive en services/muestras.service.js y
// services/rotulo.service.js; el controlador solo orquesta.
// Código ciego (RF-22): si el rol activo es Analista, las respuestas
// pasan por dtoTecnico y jamás se pobla solicitud/usuario.

// Búsqueda por código de pre-solicitud para la recepción presencial (RF-17)
const buscar = asyncHandler(async (req, res) => {
  const resultado = await buscarRecepcion(req.query.codigo);
  res.json({ ok: true, ...resultado });
});

// Recepción: exige pago (RF-09), asigna código A1/A2 + turno y estado inicial
const crear = asyncHandler(async (req, res) => {
  const muestra = await crearMuestra({ body: req.body, usuario: req.usuario });
  res.status(201).json({ ok: true, data: muestra });
});

// Listado: el Analista solo ve el DTO técnico (sin solicitud/usuario) RF-22
const listar = asyncHandler(async (req, res) => {
  const ciego = esAnalista(req);
  const poblados = ciego
    ? [{ path: 'examenes.examen', select: PARAMETROS_EXAMEN }]
    : [
        { path: 'solicitud' },
        { path: 'recepcionista' },
        { path: 'analista' },
        { path: 'examenes.examen' },
      ];

  let consulta = Muestra.find(req.alcance || {});
  poblados.forEach((campo) => {
    consulta = consulta.populate(campo);
  });
  const docs = await consulta;
  const data = docs.map((m) => (ciego ? dtoTecnico(m) : m));
  res.json({ ok: true, total: data.length, data });
});

// Detalle: mismo criterio; el Analista nunca recibe solicitud/usuario (RF-22)
const obtener = asyncHandler(async (req, res) => {
  const ciego = esAnalista(req);
  let consulta = Muestra.findById(req.params.id);
  if (ciego) {
    consulta = consulta.populate('examenes.examen', PARAMETROS_EXAMEN);
  } else {
    consulta = consulta.populate('solicitud').populate('recepcionista').populate('analista').populate('examenes.examen');
  }
  const muestra = await consulta;
  if (!muestra) return res.status(404).json({ ok: false, mensaje: 'Registro no encontrado' });
  res.json({ ok: true, data: ciego ? dtoTecnico(muestra) : muestra });
});

// Cola del día: A1 antes que A2 y luego por número de turno (RF-19, RNF-08)
const cola = asyncHandler(async (req, res) => {
  const resultado = await colaAtencion(req.query.fecha);
  res.json({ ok: true, ...resultado });
});

// Rótulo imprimible en 58/80 mm, SIN datos del cliente (RF-21, RF-22)
const rotulo = asyncHandler(async (req, res) => {
  const ancho = String(req.query.ancho || '58');
  if (!ANCHOS_ROTULO.includes(ancho)) {
    return res.status(400).json({ ok: false, mensaje: 'El ancho del rótulo debe ser 58 o 80 (mm)' });
  }

  const muestra = await Muestra.findById(req.params.id).populate('examenes.examen', POBLAR_EXAMEN);
  if (!muestra) return res.status(404).json({ ok: false, mensaje: 'Registro no encontrado' });

  res.type('html').send(htmlRotulo({ muestra, ancho }));
});

// Hoja de trabajo imprimible A4, anónima (RF-22)
const hojaTrabajo = asyncHandler(async (req, res) => {
  const muestra = await Muestra.findById(req.params.id)
    .populate('examenes.examen', POBLAR_EXAMEN)
    .populate('analista', 'nombres apellidos');
  if (!muestra) return res.status(404).json({ ok: false, mensaje: 'Registro no encontrado' });

  res.type('html').send(htmlHojaTrabajo({ muestra }));
});

// Cambia la etapa (transición válida, justificación en Re-ensayo RF-23),
// registra en el historial (RF-24) y notifica al cliente en hitos (Fase 6).
const cambiarEtapa = asyncHandler(async (req, res) => {
  const muestra = await cambiarEtapaMuestra({
    id: req.params.id,
    etapaActual: req.body.etapaActual,
    justificacion: req.body.justificacion,
    usuario: req.usuario,
  });
  res.json({ ok: true, data: esAnalista(req) ? dtoTecnico(muestra) : muestra });
});

// Asignación / reasignación de analista (RF-28, solo Administrador)
const asignar = asyncHandler(async (req, res) => {
  const muestra = await asignarAnalista({
    id: req.params.id,
    analistaId: req.body.analista,
    accion: req.body.accion,
    motivo: req.body.motivo,
    usuario: req.usuario,
  });
  res.json({ ok: true, data: muestra });
});

// Reapertura de una muestra Finalizada (RF-28, solo Administrador)
const reabrir = asyncHandler(async (req, res) => {
  const muestra = await reabrirMuestra({
    id: req.params.id,
    etapaDestino: req.body.etapaDestino,
    motivo: req.body.motivo,
    usuario: req.usuario,
  });
  res.json({ ok: true, data: esAnalista(req) ? dtoTecnico(muestra) : muestra });
});

// Des-anonimización (RF-29): contraseña + motivo auditado.
// Devuelve los datos del cliente; registra "Consulta datos cliente".
const consultarDatosCliente = asyncHandler(async (req, res) => {
  const datos = await datosCliente({
    id: req.params.id,
    contrasena: req.body.contrasena,
    motivo: req.body.motivo,
    usuario: req.usuario,
  });
  res.json({ ok: true, data: datos });
});

const muestras = {
  // CRUD base (actualizar/eliminar); listar/obtener/crear se sobreescriben
  // abajo porque aplican el código ciego (RF-22) y la recepción (RF-09).
  ...crudFactory(Muestra, ['solicitud', 'recepcionista', 'analista', 'examenes.examen']),
  buscar,
  crear,
  listar,
  obtener,
  cola,
  rotulo,
  hojaTrabajo,
  cambiarEtapa,
  asignar,
  reabrir,
  datosCliente: consultarDatosCliente,
};

// Historial de solo lectura (RF-24): sin actualizar ni eliminar.
// Las inserciones las realiza la capa de servicios/modelo, nunca la API.
const historialCrud = crudFactory(HistorialMuestra, ['muestra', 'usuario']);

const historial = {
  listar: historialCrud.listar,
  obtener: historialCrud.obtener,
};

export { muestras, historial };
