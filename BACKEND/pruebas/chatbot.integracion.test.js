// ============================================================
// Prueba de integración del asistente del laboratorio (sin IA).
// Usa supertest + mongodb-memory-server.
//
//   npm test
// ============================================================
process.env.JWT_SECRET = 'secreto-de-prueba-chatbot';
process.env.NODE_ENV = 'test';

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcryptjs';

import rutasApi from '../src/routes/index.js';
import { notFound, manejadorErrores } from '../src/middlewares/error.middleware.js';
import { generarToken } from '../src/utils/tokens.js';
import Rol from '../src/models/Rol.js';
import Usuario from '../src/models/Usuario.js';
import CategoriaAnalisis from '../src/models/CategoriaAnalisis.js';
import TipoMuestra from '../src/models/TipoMuestra.js';
import Examen from '../src/models/Examen.js';
import CuentaRecaudo from '../src/models/CuentaRecaudo.js';
import Solicitud from '../src/models/Solicitud.js';
import Cotizacion from '../src/models/Cotizacion.js';
import CuponPago from '../src/models/CuponPago.js';
import Pago from '../src/models/Pago.js';
import Muestra from '../src/models/Muestra.js';
import MensajeAsistente from '../src/models/MensajeAsistente.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use('/api', rutasApi);
app.use(notFound);
app.use(manejadorErrores);

const auth = (token) => ({ Authorization: `Bearer ${token}` });
let mongo;
let tokenCliente;
let tokenAdmin;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  const [rolCliente, rolAdmin, rolRecepcion] = await Promise.all(
    ['Cliente', 'Administrador', 'Recepcionista'].map((nombre) =>
      Rol.create({ nombre, descripcion: nombre })
    )
  );

  const hash = await bcrypt.hash('Clave1234', 4);

  const crearUsuario = (rol, correo, nombres) =>
    Usuario.create({
      rol: rol._id,
      roles: [rol._id],
      nombres,
      apellidos: 'Prueba',
      tipoDocumento: 'CC',
      numeroDocumento: correo,
      correo,
      telefono: '3000000000',
      contrasenaHash: hash,
      tipoUsuario: 'EXTERNO',
      activo: true,
    });

  const cliente = await crearUsuario(rolCliente, 'cliente-chat@prueba.com', 'Ana');
  const otroCliente = await crearUsuario(rolCliente, 'otro-chat@prueba.com', 'Luis');
  const admin = await crearUsuario(rolAdmin, 'admin-chat@prueba.com', 'Admin');
  const recepcionista = await crearUsuario(rolRecepcion, 'recepcion-chat@prueba.com', 'Recepción');

  tokenCliente = generarToken({ id: cliente._id });
  tokenAdmin = generarToken({ id: admin._id });

  const categoria = await CategoriaAnalisis.create({
    nombre: 'Microbiología',
    descripcion: 'Análisis microbiológicos',
  });
  const tipo = await TipoMuestra.create({ nombre: 'Agua', descripcion: 'Muestras de agua' });

  await Examen.create({
    categoria: categoria._id,
    tipoMuestra: tipo._id,
    nombre: 'Coliformes totales y E. coli',
    descripcion: 'Recuento microbiológico en agua',
    precio: 68000,
    tiempoRespuestaDias: 3,
    cantidadRequerida: 500,
    unidadMedida: 'ml',
    tipoEnvase: 'Frasco estéril',
    temperaturaConservacion: '2-8 °C',
    tiempoMaxTrasladoHoras: 6,
    requiereTemperatura: true,
    activo: true,
  });

  await CuentaRecaudo.create({
    banco: 'Banco de prueba',
    tipoCuenta: 'Ahorros',
    numeroCuenta: '000-0000001',
    titular: 'Laboratorio SENA',
    activa: true,
  });

  const crearSolicitudCompleta = async (usuario, codigo) => {
    const solicitud = await Solicitud.create({
      usuario: usuario._id,
      tipoMuestra: tipo._id,
      codigoPresolicitud: codigo,
      descripcionMuestra: 'Muestra de agua',
      origen: 'Industrial',
      cantidadEstimada: '500 ml',
      estado: 'Pagada',
    });

    await Muestra.create({
      solicitud: solicitud._id,
      recepcionista: recepcionista._id,
      entregadoPor: usuario.nombres,
      fechaHoraEntrega: new Date(),
      cantidadRecibida: 500,
      unidadMedida: 'ml',
      estadoEmpaque: 'Buen estado',
      codigoMuestra: `A2-2026-${codigo.slice(-4)}`,
      etapaActual: 'Análisis',
      estado: 'Aceptada',
    });

    const cotizacion = await Cotizacion.create({
      solicitud: solicitud._id,
      numeroCotizacion: `COT-${codigo}`,
      valorTotal: 68000,
    });

    const cupon = await CuponPago.create({
      cotizacion: cotizacion._id,
      codigoReferencia: `CUP-${codigo}`,
      fechaLimitePago: new Date(Date.now() + 86400000),
    });

    await Pago.create({
      cupon: cupon._id,
      metodo: 'Transferencia electrónica',
      fechaPagoReportada: new Date(),
      valorReportado: 68000,
      estado: 'Pendiente de verificación',
    });

    return solicitud;
  };

  await crearSolicitudCompleta(cliente, 'PRE-2026-0001');
  await crearSolicitudCompleta(otroCliente, 'PRE-2026-0002');

});

after(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

const conversar = (mensaje, token = null) => {
  const peticion = request(app).post('/api/asistente/chat');
  if (token) peticion.set(auth(token));
  return peticion.send({ mensaje });
};

test('catálogo público sin token y sin IA', async () => {
  const r = await conversar('1', null);
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.data.usoLlm, false);
  assert.equal(r.body.data.tokensEntrada, 0);
  assert.match(r.body.data.respuesta, /Coliformes totales/);
  assert.match(r.body.data.respuesta, /68[.\s]*000/);

  const guardados = await MensajeAsistente.countDocuments();
  assert.equal(guardados, 0, 'las conversaciones públicas no se persisten');
});

test('búsqueda por término en el catálogo', async () => {
  const r = await conversar('¿Qué exámenes tienen para agua?', null);
  assert.equal(r.status, 200);
  assert.match(r.body.data.respuesta, /Coliformes totales/);
});

test('pregunta desconocida se declara', async () => {
  const r = await conversar('¿Cuál es el horario de la cafetería?', null);
  assert.equal(r.status, 200);
  assert.equal(r.body.data.intencion, 'no_reconocida');
  assert.match(r.body.data.respuesta, /No reconocí tu pregunta/i);
});

test('orden sin sesión pide iniciar sesión', async () => {
  const r = await conversar('¿En qué va mi solicitud?', null);
  assert.equal(r.status, 200);
  assert.equal(r.body.data.intencion, 'login_requerido');
});

test('cuentas de recaudo solo con sesión', async () => {
  const publico = await conversar('3', null);
  assert.equal(publico.status, 200);
  assert.equal(publico.body.data.intencion, 'no_disponible');
  assert.doesNotMatch(publico.body.data.respuesta, /000-0000001/);

  const autenticado = await conversar('3', tokenCliente);
  assert.equal(autenticado.status, 200);
  assert.match(autenticado.body.data.respuesta, /Banco de prueba/);
  assert.match(autenticado.body.data.respuesta, /000-0000001/);
});

test('cliente ve su solicitud, muestra y pago, pero no los de otro', async () => {
  const r = await conversar('estado de mi solicitud', tokenCliente);
  assert.equal(r.status, 200);
  assert.equal(r.body.data.intencion, 'estado');
  assert.match(r.body.data.respuesta, /PRE-2026-0001/);
  assert.match(r.body.data.respuesta, /A2-2026-0001/);
  assert.match(r.body.data.respuesta, /Pendiente de verificación/);
  assert.doesNotMatch(r.body.data.respuesta, /PRE-2026-0002/);
});

test('un rol administrativo no recibe datos personales del chat', async () => {
  const r = await conversar('estado de mi solicitud', tokenAdmin);
  assert.equal(r.status, 200);
  assert.equal(r.body.data.intencion, 'no_disponible');
  assert.match(r.body.data.respuesta, /panel administrativo/i);
});

test('el historial autenticado se guarda en MensajeAsistente', async () => {
  await MensajeAsistente.deleteMany({});
  const r = await conversar('1', tokenCliente);
  assert.equal(r.status, 200);
  assert.equal(r.body.data.mensajeId.length > 0, true);

  const guardados = await MensajeAsistente.find({ usuario: { $ne: null } });
  assert.equal(guardados.length, 2);
  assert.equal(guardados[0].rol, 'usuario');
  assert.equal(guardados[1].rol, 'asistente');
});

test('token inválido responde 401', async () => {
  const r = await request(app)
    .post('/api/asistente/chat')
    .set({ Authorization: 'Bearer token-invalido' })
    .send({ mensaje: 'hola' });
  assert.equal(r.status, 401);
});

test('mensaje vacío responde 400', async () => {
  const r = await conversar('   ', null);
  assert.equal(r.status, 400);
});
