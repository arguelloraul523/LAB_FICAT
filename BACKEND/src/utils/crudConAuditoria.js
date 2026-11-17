import asyncHandler from './asyncHandler.js';
import { sanitizarBody } from '../constants/camposPermitidos.js';
import { paginar } from './paginar.js';
import AuditoriaConfiguracion from '../models/AuditoriaConfiguracion.js';

// ============================================================
// CRUD con auditoría (RF-27/RF-31). Igual que crudFactory, pero en
// crear/actualizar/eliminar registra en AuditoriaConfiguracion quién
// cambió qué (antes/después). Además fija `modificadoPor` y
// `fechaModificacion` si el modelo los declara.
// ============================================================

const plano = (doc) => (doc && typeof doc.toObject === 'function' ? doc.toObject() : doc);

const tieneCampo = (Model, campo) => Boolean(Model.schema && Model.schema.path(campo));

const registrarAuditoria = async ({ entidad, referencia, accion, antes, despues, usuario }) => {
  try {
    await AuditoriaConfiguracion.create({
      entidad,
      referencia: referencia || null,
      accion,
      antes: antes ? plano(antes) : null,
      despues: despues ? plano(despues) : null,
      usuario: usuario?._id || usuario || null,
    });
  } catch (err) {
    // La auditoría es best-effort: nunca debe tumbar la operación.
    console.error(`⚠️  No se pudo registrar la auditoría de ${entidad}: ${err.message}`);
  }
};

const crudConAuditoria = (Model, { entidad, populate = [] } = {}) => {
  const nombreEntidad = entidad || Model.modelName;

  const listar = asyncHandler(async (req, res) => {
    const { pagina, limite } = req.query;

    // Paginación opcional (RNF-04): solo si llega ?pagina o ?limite.
    if (pagina !== undefined || limite !== undefined) {
      const resultado = await paginar({
        Model,
        filtro: req.alcance || {},
        populate,
        pagina,
        limite,
      });
      return res.json({ ok: true, ...resultado });
    }

    let query = Model.find(req.alcance || {});
    populate.forEach((campo) => {
      query = query.populate(campo);
    });
    const docs = await query;
    res.json({ ok: true, total: docs.length, data: docs });
  });

  const obtener = asyncHandler(async (req, res) => {
    let query = Model.findById(req.params.id);
    populate.forEach((campo) => {
      query = query.populate(campo);
    });
    const doc = await query;
    if (!doc) return res.status(404).json({ ok: false, mensaje: 'Registro no encontrado' });
    res.json({ ok: true, data: doc });
  });

  const crear = asyncHandler(async (req, res) => {
    const datos = sanitizarBody(req.body, {
      permitir: req.camposPermitidos || [],
      permitirEstado: req.camposEstadoPermitidos || [],
    });
    if (tieneCampo(Model, 'modificadoPor') && req.usuario) datos.modificadoPor = req.usuario._id;
    if (tieneCampo(Model, 'fechaModificacion')) datos.fechaModificacion = new Date();

    const doc = await Model.create(datos);
    await registrarAuditoria({
      entidad: nombreEntidad,
      referencia: doc._id,
      accion: 'Crear',
      antes: null,
      despues: doc,
      usuario: req.usuario,
    });
    res.status(201).json({ ok: true, data: doc });
  });

  const actualizar = asyncHandler(async (req, res) => {
    const antes = await Model.findById(req.params.id);
    if (!antes) return res.status(404).json({ ok: false, mensaje: 'Registro no encontrado' });

    const datos = sanitizarBody(req.body, {
      permitir: req.camposPermitidos || [],
      permitirEstado: req.camposEstadoPermitidos || [],
    });
    if (tieneCampo(Model, 'modificadoPor') && req.usuario) datos.modificadoPor = req.usuario._id;
    if (tieneCampo(Model, 'fechaModificacion')) datos.fechaModificacion = new Date();

    const doc = await Model.findByIdAndUpdate(req.params.id, datos, {
      new: true,
      runValidators: true,
    });
    await registrarAuditoria({
      entidad: nombreEntidad,
      referencia: doc._id,
      accion: 'Actualizar',
      antes,
      despues: doc,
      usuario: req.usuario,
    });
    res.json({ ok: true, data: doc });
  });

  const eliminar = asyncHandler(async (req, res) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, mensaje: 'Registro no encontrado' });
    await registrarAuditoria({
      entidad: nombreEntidad,
      referencia: doc._id,
      accion: 'Eliminar',
      antes: doc,
      despues: null,
      usuario: req.usuario,
    });
    res.json({ ok: true, mensaje: 'Registro eliminado correctamente' });
  });

  return { listar, obtener, crear, actualizar, eliminar };
};

export default crudConAuditoria;
