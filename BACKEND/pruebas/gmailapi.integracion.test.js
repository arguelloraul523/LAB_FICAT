// ============================================================
// Prueba de integración: canal Gmail API (Google Cloud) por OAuth2.
//
//   npm test   ·   node --test pruebas/gmailapi.integracion.test.js
//
// No hay red ni credenciales reales: se sustituye `global.fetch` por un
// doble que simula el endpoint de tokens de Google, el perfil de la cuenta
// y el envío de mensajes. Se comprueba que el RFC 2822 que viaja en `raw`
// lleva el código de 6 dígitos con el remitente y el destinatario correctos.
//
// El token se devuelve con `expires_in: 0` a propósito: así la caché del
// mailer nunca sirve y cada caso puede cambiar de comportamiento libremente.
// ============================================================
process.env.JWT_SECRET = 'secreto-de-prueba-gmailapi';
process.env.NODE_ENV = 'test';

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';

import rutasApi from '../src/routes/index.js';
import { notFound, manejadorErrores } from '../src/middlewares/error.middleware.js';
import Rol from '../src/models/Rol.js';
import Usuario from '../src/models/Usuario.js';
import { enviarCorreo, estadoCorreo } from '../src/utils/mailer.js';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use('/api', rutasApi);
app.use(notFound);
app.use(manejadorErrores);

const CORREO = 'cliente.gmail@labficat.test';
const REMITENTE = 'lab.ficatt@gmail.com';

let mongo;
const originalFetch = globalThis.fetch;
let llamadas = [];
let modo = 'ok'; // 'ok' | 'envio-falla' | 'token-invalido'

// Respuesta mínima compatible con fetch (ok/status/json/text).
const respuesta = (status, datos) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => datos,
  text: async () => JSON.stringify(datos),
});

const dobleFetch = async (url, opciones = {}) => {
  const destino = String(url);
  llamadas.push({ url: destino, opciones });

  if (destino.includes('oauth2.googleapis.com/token')) {
    if (modo === 'token-invalido') {
      return respuesta(400, {
        error: 'invalid_grant',
        error_description: 'Token has been revoked.',
      });
    }
    return respuesta(200, { access_token: 'tok-falso', expires_in: 0, token_type: 'Bearer' });
  }
  if (destino.includes('gmail/v1/users/me/profile')) {
    return respuesta(200, { emailAddress: REMITENTE, messagesTotal: 0 });
  }
  if (destino.includes('gmail/v1/users/me/messages/send')) {
    if (modo === 'envio-falla') return respuesta(500, { error: { message: 'internal error' } });
    return respuesta(200, { id: 'msg-falso', threadId: 'thr-falso' });
  }
  return respuesta(404, { error: 'desconocido' });
};

// El mailer manda el RFC 2822 en base64url dentro de `raw`.
const decodificarRaw = (raw) => Buffer.from(raw, 'base64url').toString('utf8');

const envios = () => llamadas.filter((l) => l.url.includes('/messages/send'));

const ultimoMensaje = () => {
  const ultimo = envios()[envios().length - 1];
  return ultimo ? decodificarRaw(JSON.parse(ultimo.opciones.body).raw) : null;
};

// Lee una cabecera; si viene en RFC 2047 (tildes) la descodifica.
const cabecera = (mensaje, nombre) => {
  const linea = mensaje.match(new RegExp(`^${nombre}: (.*)$`, 'm'));
  if (!linea) return null;
  const valor = linea[1].trim();
  const rfc2047 = valor.match(/^=\?UTF-8\?B\?(.+?)\?=$/);
  return rfc2047 ? Buffer.from(rfc2047[1], 'base64').toString('utf8') : valor;
};

// El código de 6 dígitos aparece en la parte de texto plano del multipart.
const extraerCodigo = (mensaje) => {
  const m = mensaje.match(/\s(\d{6})\s/);
  return m ? m[1] : null;
};

before(async () => {
  // Canal Gmail API explícito, sin credenciales todavía (caso "no configurado").
  process.env.MAIL_PROVIDER = 'gmailapi';
  delete process.env.MAIL_HOST;
  delete process.env.MAIL_USER;
  delete process.env.MAIL_PASS;
  delete process.env.MAIL_PORT;
  delete process.env.MAIL_FROM;
  delete process.env.GMAIL_FROM;
  delete process.env.GMAIL_CLIENT_ID;
  delete process.env.GMAIL_CLIENT_SECRET;
  delete process.env.GMAIL_REFRESH_TOKEN;

  globalThis.fetch = dobleFetch;

  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  const rol = await Rol.create({ nombre: 'Cliente', descripcion: 'Cliente' });
  const hash = await bcrypt.hash('Vieja1234', 4);
  await Usuario.create({
    rol: rol._id,
    roles: [rol._id],
    nombres: 'Prueba',
    apellidos: 'Gmail API',
    tipoDocumento: 'CC',
    numeroDocumento: '87654321',
    correo: CORREO,
    telefono: '3000000000',
    tipoUsuario: 'EXTERNO',
    contrasenaHash: hash,
  });
});

after(async () => {
  globalThis.fetch = originalFetch;
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test('Gmail API: sin credenciales responde 503', async () => {
  const r = await request(app).post('/api/auth/olvide-contrasena').send({ correo: CORREO });
  assert.equal(r.status, 503, 'sin credenciales debe responder 503');
  assert.equal(r.body.codigo, 'SMTP_NO_CONFIGURADO');
  assert.equal(envios().length, 0, 'no debe intentar enviar nada');
});

test('Gmail API: estado del correo reporta el canal OAuth2', async () => {
  const estado = estadoCorreo();
  assert.equal(estado.proveedor, 'Gmail API (Google Cloud)');
  assert.equal(estado.configurado, false, 'faltan credenciales en este punto');
  assert.deepEqual(estado.faltan, [
    'GMAIL_CLIENT_ID',
    'GMAIL_CLIENT_SECRET',
    'GMAIL_REFRESH_TOKEN',
  ]);
});

test('Gmail API: envía el código por la API y el mensaje sale bien formado', async () => {
  process.env.GMAIL_CLIENT_ID = 'client-id-falso';
  process.env.GMAIL_CLIENT_SECRET = 'client-secret-falso';
  process.env.GMAIL_REFRESH_TOKEN = 'refresh-token-falso';
  llamadas = [];
  modo = 'ok';

  const r = await request(app).post('/api/auth/olvide-contrasena').send({ correo: CORREO });
  assert.equal(r.status, 200, `esperaba 200 y llegó ${r.status}: ${JSON.stringify(r.body)}`);
  assert.equal(r.body.ok, true);
  assert.ok(!('enlace' in r.body), 'no debe devolver enlace ni token');

  // Un solo envío, con el token OAuth2 en la cabecera.
  assert.equal(envios().length, 1, 'debe enviarse exactamente un mensaje');
  const envio = envios()[0];
  assert.equal(envio.opciones.headers.Authorization, 'Bearer tok-falso');

  const mensaje = ultimoMensaje();
  assert.ok(mensaje, 'raw debe decodificarse');
  assert.equal(cabecera(mensaje, 'From'), REMITENTE, 'el remitente es la cuenta autenticada');
  assert.equal(cabecera(mensaje, 'To'), CORREO, 'el destinatario es el cliente');
  assert.match(cabecera(mensaje, 'Subject') || '', /verificaci[oó]n/i, 'asunto con el código');
  assert.match(mensaje, /multipart\/alternative/, 'texto plano + HTML');

  const codigo = extraerCodigo(mensaje);
  assert.ok(codigo && /^\d{6}$/.test(codigo), 'el mensaje contiene un código de 6 dígitos');
});

test('Gmail API: fallo de la API responde 500 SMTP_FALLO', async () => {
  modo = 'envio-falla';
  const correosAntes = envios().length;

  const r = await request(app).post('/api/auth/olvide-contrasena').send({ correo: CORREO });
  assert.equal(r.status, 500, 'un fallo de la API debe responder 500');
  assert.equal(r.body.codigo, 'SMTP_FALLO');
  assert.ok(envios().length > correosAntes, 'se reintentó contra la API');
});

test('Gmail API: refresh token revocado produce un error claro', async () => {
  modo = 'token-invalido';
  await assert.rejects(
    () => enviarCorreo({ para: CORREO, asunto: 'Prueba', texto: 'Hola' }),
    /refresh token/,
    'el error debe indicar que hay que regenerar el refresh token'
  );
});
