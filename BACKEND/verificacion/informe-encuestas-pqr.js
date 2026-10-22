// ============================================================
// Verificación de informes, encuestas, cierre y PQR (RF-25, RF-26, RF-31).
// SIN conectar a MongoDB.
// Uso:  node verificacion/informe-encuestas-pqr.js   (sale con código 1 si algo falla)
// No forma parte de la aplicación; replica las reglas con dobles en
// memoria. Los casos HTTP están en API_TEST.http (60+).
// Criterios del usuario:
//   - la encuesta es escala 1-5, todas las preguntas obligatorias,
//   - el informe NO se descarga sin encuesta completa, ni conociendo la URL,
//   - el cierre exige informe aprobado + encuesta respondida,
//   - la PQR sigue un flujo de estados con resolución con fecha.
// ============================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validationResult } from 'express-validator';
import { transicionValida } from '../src/constants/estados.js';
import { validarRegistrarEncuesta } from '../src/validators/encuesta.validators.js';
import { validarCambiarEstadoPqr } from '../src/validators/inconformidad.validators.js';
import { registrarEncuesta } from '../src/services/encuestas.service.js';
import {
  crearInforme,
  aprobarInforme,
  prepararDescarga,
  CARPETA_INFORMES,
} from '../src/services/informes.service.js';
import { intentarCerrarSolicitud } from '../src/services/cierre.service.js';
import { cambiarEstadoInconformidad } from '../src/services/inconformidades.service.js';
import Encuesta from '../src/models/Encuesta.js';
import Inconformidad from '../src/models/Inconformidad.js';
import Informe from '../src/models/Informe.js';
import Muestra from '../src/models/Muestra.js';
import Notificacion from '../src/models/Notificacion.js';
import PreguntaEncuesta from '../src/models/PreguntaEncuesta.js';
import Solicitud from '../src/models/Solicitud.js';
import Usuario from '../src/models/Usuario.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let total = 0;
let fallos = 0;
const ok = (c, m) => {
  total++;
  if (c) console.log('ok: ' + m);
  else {
    fallos++;
    console.log('FALLO: ' + m);
  }
};
const correr = async (cadena, body, query = {}) => {
  const req = { body, query };
  for (const c of cadena) await c.run(req);
  return validationResult(req);
};
const errorEsperado = async (fn, status, msg) => {
  try {
    await fn();
    ok(false, msg);
  } catch (e) {
    ok(e.statusCode === status, msg);
  }
};

(async () => {
  // ---- Dobles de BD ----
  const notificaciones = [];
  Notificacion.create = async (d) => {
    notificaciones.push(d);
    return d;
  };

  let usuarioActual = { _id: 'u1', correo: 'ana@x.com', nombres: 'Ana' };
  Usuario.findById = () => ({ select: async () => usuarioActual });

  let solicitudActual = null;
  Solicitud.findById = async () => solicitudActual;

  let muestrasSolicitud = [];
  Muestra.find = () => ({ select: async () => muestrasSolicitud });
  let muestraSel = null;
  Muestra.findById = () => ({ select: async () => muestraSel });

  let informeActual = null;
  const thenable = (getVal) => {
    const chain = { populate: () => chain, then: (r, j) => Promise.resolve(getVal()).then(r, j) };
    return chain;
  };
  Informe.findById = () => thenable(() => informeActual);
  let informeBuscado = null;
  Informe.findOne = async () => informeBuscado;
  Informe.create = async (d) => ({ ...d, _id: 'inf1' });

  let encuestaExistente = null;
  Encuesta.findOne = async (filtro) => {
    if (!encuestaExistente) return null;
    // Respeta el filtro { completa: true } de cierre/descarga.
    if (filtro && filtro.completa === true && encuestaExistente.completa !== true) return null;
    return encuestaExistente;
  };
  Encuesta.create = async (d) => ({ ...d, _id: 'enc1' });

  let preguntasActivas = [];
  PreguntaEncuesta.find = () => ({ select: async () => preguntasActivas });

  let pqrActual = null;
  Inconformidad.findById = async () => pqrActual;

  const nuevoSolicitud = (estado = 'En proceso') => {
    const s = { _id: 'sol1', estado, codigoPresolicitud: 'PRE-2026-0001', usuario: 'u1', fechaCierre: null };
    s.save = async () => s;
    return s;
  };
  const reset = () => {
    notificaciones.length = 0;
    informeBuscado = null;
    encuestaExistente = null;
    muestrasSolicitud = [];
    solicitudActual = null;
    usuarioActual = { _id: 'u1', correo: 'ana@x.com', nombres: 'Ana' };
  };

  // ---- 1) Máquinas de estado (8) ----
  ok(transicionValida('informe', 'En revisión', 'Aprobado'), 'informe: En revisión -> Aprobado');
  ok(!transicionValida('informe', 'Aprobado', 'En revisión'), 'informe: Aprobado es terminal');
  ok(transicionValida('inconformidad', 'Abierta', 'En revisión'), 'PQR: Abierta -> En revisión');
  ok(transicionValida('inconformidad', 'En revisión', 'Resuelta'), 'PQR: En revisión -> Resuelta');
  ok(transicionValida('inconformidad', 'Resuelta', 'Cerrada'), 'PQR: Resuelta -> Cerrada');
  ok(transicionValida('inconformidad', 'Resuelta', 'En revisión'), 'PQR: Resuelta se puede reabrir');
  ok(!transicionValida('inconformidad', 'Abierta', 'Resuelta'), 'PQR: no se salta a Resuelta');
  ok(!transicionValida('inconformidad', 'Cerrada', 'Abierta'), 'PQR: Cerrada es terminal');

  // ---- 2) Validador de encuesta (5) ----
  const respuestasBase = [{ pregunta: '507f1f77bcf86cd799439011', calificacion: 5 }];
  let r = await correr(validarRegistrarEncuesta, { solicitud: '507f1f77bcf86cd799439012', respuestas: respuestasBase });
  ok(r.isEmpty(), 'validar encuesta: payload válido pasa');
  r = await correr(validarRegistrarEncuesta, { solicitud: '507f1f77bcf86cd799439012', respuestas: [] });
  ok(!r.isEmpty(), 'validar encuesta: sin respuestas rechazado');
  r = await correr(validarRegistrarEncuesta, {
    solicitud: '507f1f77bcf86cd799439012',
    respuestas: [{ pregunta: '507f1f77bcf86cd799439011', calificacion: 0 }],
  });
  ok(!r.isEmpty(), 'validar encuesta: calificación 0 rechazada');
  r = await correr(validarRegistrarEncuesta, {
    solicitud: '507f1f77bcf86cd799439012',
    respuestas: [{ pregunta: '507f1f77bcf86cd799439011', calificacion: 6 }],
  });
  ok(!r.isEmpty(), 'validar encuesta: calificación 6 rechazada');
  r = await correr(validarRegistrarEncuesta, {
    solicitud: '507f1f77bcf86cd799439012',
    respuestas: [{ pregunta: '507f1f77bcf86cd799439011', calificacion: 3.5 }],
  });
  ok(!r.isEmpty(), 'validar encuesta: calificación decimal rechazada');

  // ---- 3) Servicio de encuesta (6) ----
  reset();
  solicitudActual = nuevoSolicitud();
  preguntasActivas = [{ _id: 'p1' }, { _id: 'p2' }];
  await errorEsperado(
    () =>
      registrarEncuesta({
        body: { solicitud: 'sol1', respuestas: [{ pregunta: 'p1', calificacion: 5 }] },
        usuario: { _id: 'u1', rol: { nombre: 'Cliente' } },
      }),
    400,
    'encuesta: falta una pregunta -> 400'
  );

  await errorEsperado(
    () =>
      registrarEncuesta({
        body: {
          solicitud: 'sol1',
          respuestas: [
            { pregunta: 'p1', calificacion: 5 },
            { pregunta: 'p2', calificacion: 9 },
          ],
        },
        usuario: { _id: 'u1', rol: { nombre: 'Cliente' } },
      }),
    400,
    'encuesta: calificación fuera de 1-5 -> 400'
  );

  await errorEsperado(
    () =>
      registrarEncuesta({
        body: {
          solicitud: 'sol1',
          respuestas: [
            { pregunta: 'p1', calificacion: 5 },
            { pregunta: 'pX', calificacion: 5 },
          ],
        },
        usuario: { _id: 'u1', rol: { nombre: 'Cliente' } },
      }),
    400,
    'encuesta: pregunta inactiva -> 400'
  );

  encuestaExistente = { _id: 'enc0', completa: true };
  await errorEsperado(
    () =>
      registrarEncuesta({
        body: {
          solicitud: 'sol1',
          respuestas: [
            { pregunta: 'p1', calificacion: 5 },
            { pregunta: 'p2', calificacion: 4 },
          ],
        },
        usuario: { _id: 'u1', rol: { nombre: 'Cliente' } },
      }),
    409,
    'encuesta: duplicada -> 409'
  );

  encuestaExistente = null;
  await errorEsperado(
    () =>
      registrarEncuesta({
        body: {
          solicitud: 'sol1',
          respuestas: [
            { pregunta: 'p1', calificacion: 5 },
            { pregunta: 'p2', calificacion: 4 },
          ],
        },
        usuario: { _id: 'ajeno', rol: { nombre: 'Cliente' } },
      }),
    403,
    'encuesta: cliente ajeno -> 403'
  );

  const encuestaOk = await registrarEncuesta({
    body: {
      solicitud: 'sol1',
      respuestas: [
        { pregunta: 'p1', calificacion: 5 },
        { pregunta: 'p2', calificacion: 4 },
      ],
      comentario: 'Muy bueno',
    },
    usuario: { _id: 'u1', rol: { nombre: 'Cliente' } },
  });
  ok(encuestaOk.completa === true && encuestaOk.respuestas.length === 2, 'encuesta: válida queda completa con sus respuestas');

  // ---- 4) Cierre automático (5) ----
  reset();
  solicitudActual = nuevoSolicitud();
  muestrasSolicitud = [{ _id: 'm1' }];
  informeBuscado = null;
  encuestaExistente = { completa: true };
  ok((await intentarCerrarSolicitud('sol1')) === null, 'cierre: sin informe aprobado no cierra');
  ok(solicitudActual.estado === 'En proceso', 'cierre: la solicitud sigue En proceso');

  informeBuscado = { estado: 'Aprobado' };
  encuestaExistente = null;
  ok((await intentarCerrarSolicitud('sol1')) === null, 'cierre: sin encuesta completa no cierra');

  encuestaExistente = { completa: true };
  const cerrada = await intentarCerrarSolicitud('sol1');
  ok(cerrada && cerrada.estado === 'Finalizada' && cerrada.fechaCierre, 'cierre: con ambos queda Finalizada + fechaCierre');
  ok(notificaciones.length === 1, 'cierre: notifica al cliente (App + correo)');

  // ---- 5) Informe: crear y aprobar (5) ----
  await errorEsperado(() => crearInforme({ body: {} }), 400, 'informe: sin archivoPdf -> 400');
  const creado = await crearInforme({ body: { muestra: 'm1', archivoPdf: 'x.pdf' } });
  ok(creado.estado === 'En revisión' && creado.revisadoPor === null, 'informe: nace En revisión sin revisor');

  informeActual = { _id: 'inf1', estado: 'Aprobado', archivoPdf: 'x.pdf', muestra: 'm1' };
  await errorEsperado(() => aprobarInforme({ id: 'inf1', usuario: { _id: 'a1' } }), 409, 'informe: ya aprobado -> 409');

  reset();
  informeActual = { _id: 'inf1', estado: 'En revisión', archivoPdf: 'x.pdf', muestra: 'm1' };
  informeActual.save = async () => informeActual;
  muestraSel = { _id: 'm1', solicitud: 'sol1', codigoMuestra: 'A1-2026-0001' };
  const aprobado = await aprobarInforme({ id: 'inf1', usuario: { _id: 'a1' } });
  ok(
    aprobado.estado === 'Aprobado' && String(aprobado.revisadoPor) === 'a1' && aprobado.fechaValidacion,
    'informe: aprobar fija estado, revisor y fecha'
  );
  ok(notificaciones.length === 0, 'informe: aprobar sin encuesta no cierra (sin notificación de cierre)');

  // ---- 6) Descarga protegida (criterio central) (4) ----
  const ARCHIVO = path.join(CARPETA_INFORMES, 'verificacion-test.pdf');
  fs.mkdirSync(CARPETA_INFORMES, { recursive: true });
  fs.writeFileSync(ARCHIVO, 'PDF de prueba');

  reset();
  informeActual = { _id: 'inf1', estado: 'En revisión', archivoPdf: 'verificacion-test.pdf', muestra: { solicitud: 'sol1', codigoMuestra: 'A1-2026-0001' } };
  await errorEsperado(() => prepararDescarga('inf1'), 409, 'descarga: informe no aprobado -> 409');

  informeActual.estado = 'Aprobado';
  encuestaExistente = null;
  try {
    await prepararDescarga('inf1');
    ok(false, 'descarga: sin encuesta -> 403 ENCUESTA_PENDIENTE');
  } catch (e) {
    ok(e.statusCode === 403 && e.codigo === 'ENCUESTA_PENDIENTE', 'descarga: sin encuesta -> 403 ENCUESTA_PENDIENTE');
  }

  encuestaExistente = { completa: true };
  const descarga = await prepararDescarga('inf1');
  ok(/informe-A1-2026-0001\.pdf$/.test(descarga.nombre), 'descarga: con encuesta completa entrega el stream');

  encuestaExistente = { completa: false };
  try {
    await prepararDescarga('inf1');
    ok(false, 'descarga: encuesta incompleta -> 403');
  } catch (e) {
    ok(e.statusCode === 403 && e.codigo === 'ENCUESTA_PENDIENTE', 'descarga: encuesta incompleta -> 403 ENCUESTA_PENDIENTE');
  }
  fs.unlinkSync(ARCHIVO);

  // ---- 7) PQR: flujo y resolución (6) ----
  const nuevoPqr = (estado) => {
    const p = { _id: 'p1', tipo: 'Queja', estado, respuesta: null, fechaResolucion: null, usuario: 'u1', solicitud: null };
    p.save = async () => p;
    return p;
  };

  reset();
  pqrActual = nuevoPqr('Abierta');
  await errorEsperado(
    () => cambiarEstadoInconformidad({ id: 'p1', estado: 'Resuelta', respuesta: 'x', usuario: { _id: 'a1' } }),
    409,
    'PQR: transición inválida -> 409'
  );

  pqrActual = nuevoPqr('En revisión');
  await errorEsperado(
    () => cambiarEstadoInconformidad({ id: 'p1', estado: 'Resuelta', respuesta: '   ', usuario: { _id: 'a1' } }),
    400,
    'PQR: resolver sin respuesta -> 400'
  );

  reset();
  pqrActual = nuevoPqr('En revisión');
  const resuelta = await cambiarEstadoInconformidad({
    id: 'p1',
    estado: 'Resuelta',
    respuesta: 'Se corrigió el proceso',
    usuario: { _id: 'a1' },
  });
  ok(resuelta.estado === 'Resuelta' && resuelta.fechaResolucion && resuelta.respuesta, 'PQR: resolver fija estado, respuesta y fecha');
  ok(notificaciones.length === 1, 'PQR: notifica al usuario');

  const cerradaPqr = await cambiarEstadoInconformidad({ id: 'p1', estado: 'Cerrada', usuario: { _id: 'a1' } });
  ok(cerradaPqr.estado === 'Cerrada', 'PQR: Resuelta -> Cerrada');

  // Una PQR Resuelta puede reabrirse a En revisión (se prueba desde Resuelta).
  pqrActual = nuevoPqr('Resuelta');
  const reabierta = await cambiarEstadoInconformidad({ id: 'p1', estado: 'En revisión', usuario: { _id: 'a1' } });
  ok(reabierta.estado === 'En revisión', 'PQR: se puede reabrir una Resuelta');

  // ---- 8) Validador de PQR (2) ----
  r = await correr(validarCambiarEstadoPqr, { estado: 'Resuelta', respuesta: 'ok' });
  ok(r.isEmpty(), 'validar PQR: payload válido pasa');
  r = await correr(validarCambiarEstadoPqr, { estado: 'Inventado' });
  ok(!r.isEmpty(), 'validar PQR: estado inválido rechazado');

  console.log(`\nInformes/encuestas/PQR: ${total} aserciones, ${fallos} fallo(s)`);
  if (fallos > 0) process.exit(1);
})();
