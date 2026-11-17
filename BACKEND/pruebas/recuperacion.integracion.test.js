// ============================================================
// Prueba de integración: recuperación de contraseña en 3 pasos
// (correo -> código de 6 dígitos por correo -> contraseña nueva).
//
//   npm test   ·   node --test pruebas/recuperacion.integracion.test.js
//
// Sin SMTP configurado el backend responde 503 (no existe el "truco" de
// devolver el enlace). Para el camino feliz se levanta un mini-SMTP en
// memoria (solo handshake SMTP) y se captura el correo para leer el código,
// igual que lo haría la bandeja de entrada del usuario.
// ============================================================
process.env.JWT_SECRET = 'secreto-de-prueba-recuperacion';
process.env.NODE_ENV = 'test';
// Asegura el caso "sin SMTP" al inicio (se configura después para el envío).
delete process.env.MAIL_HOST;
delete process.env.MAIL_USER;
delete process.env.MAIL_PASS;
delete process.env.MAIL_PORT;

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';

import rutasApi from '../src/routes/index.js';
import { notFound, manejadorErrores } from '../src/middlewares/error.middleware.js';
import Rol from '../src/models/Rol.js';
import Usuario from '../src/models/Usuario.js';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use('/api', rutasApi);
app.use(notFound);
app.use(manejadorErrores);

const CORREO = 'cliente.recupera@labficat.test';
const CONTRASENA = 'Vieja1234';
const auth = (token) => ({ Authorization: `Bearer ${token}` });

let mongo;
let servidorSmtp;
let puertoSmtp = 0;
let correosRecibidos = [];

// ---- Mini-SMTP en memoria -------------------------------------------------
// Acepta la conversación mínima de nodemailer (EHLO/MAIL/RCPT/DATA/QUIT)
// sin TLS ni AUTH, y guarda los mensajes para leerlos desde el test.
const crearSmtpFalso = () =>
  new Promise((resolver) => {
    const servidor = net.createServer((socket) => {
      let enDatos = false;
      let acumulado = '';
      socket.write('220 localhost LABFICAT-test\r\n');
      socket.on('data', (buf) => {
        const texto = buf.toString('utf8');
        if (enDatos) {
          acumulado += texto;
          if (acumulado.includes('\r\n.\r\n')) {
            correosRecibidos.push(acumulado);
            enDatos = false;
            acumulado = '';
            socket.write('250 OK\r\n');
          }
          return;
        }
        texto.split('\r\n').forEach((linea) => {
          if (!linea) return;
          const cmd = linea.toUpperCase();
          if (cmd.startsWith('EHLO')) socket.write('250-localhost\r\n250 SIZE 10240000\r\n');
          else if (cmd.startsWith('HELO')) socket.write('250 localhost\r\n');
          else if (cmd.startsWith('MAIL FROM') || cmd.startsWith('RCPT TO')) socket.write('250 OK\r\n');
          else if (cmd === 'DATA') {
            socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
            enDatos = true;
          } else if (cmd.startsWith('QUIT')) {
            socket.write('221 Bye\r\n');
            socket.end();
          } else socket.write('250 OK\r\n');
        });
      });
      socket.on('error', () => {});
    });
    servidor.listen(0, '127.0.0.1', () => {
      resolver(servidor);
    });
  });

// Decodifica quoted-printable (codificación que nodemailer aplica al cuerpo)
// y lee el código del último correo enviado.
const decodificarQP = (texto) => {
  const sinContinuaciones = texto.replace(/=(\r?\n)/g, '');
  const bytes = sinContinuaciones.replace(
    /=([0-9A-F]{2})/g,
    (_, hex) => String.fromCharCode(parseInt(hex, 16))
  );
  return Buffer.from(bytes, 'binary').toString('utf8');
};

const ultimoCodigo = () => {
  const ultimo = decodificarQP(correosRecibidos[correosRecibidos.length - 1] || '');
  // Dos formatos posibles: el texto plano histórico ("Tu código es: 123456")
  // y la plantilla HTML (el código va en la caja grande, entre etiquetas).
  const match =
    ultimo.match(/c[oó]digo de verificaci[oó]n es:\s*(\d{6})/i) ||
    ultimo.match(/c[oó]digo es:\s*(\d{6})/i) ||
    ultimo.match(/>\s*(\d{6})\s*</);
  return match ? match[1] : null;
};

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  const rol = await Rol.create({ nombre: 'Cliente', descripcion: 'Cliente' });
  const hash = await bcrypt.hash(CONTRASENA, 4);
  await Usuario.create({
    rol: rol._id,
    roles: [rol._id],
    nombres: 'Prueba',
    apellidos: 'Recuperación',
    tipoDocumento: 'CC',
    numeroDocumento: '12345678',
    correo: CORREO,
    telefono: '3000000000',
    tipoUsuario: 'EXTERNO',
    contrasenaHash: hash,
  });

  // SMTP en memoria para el caso "configurado".
  servidorSmtp = await crearSmtpFalso();
  puertoSmtp = servidorSmtp.address().port;
  process.env.MAIL_HOST = '127.0.0.1';
  process.env.MAIL_PORT = String(puertoSmtp);
  process.env.MAIL_USER = 'test@labficat.test';
  process.env.MAIL_PASS = 'clave-falsa';
});

after(async () => {
  if (servidorSmtp) await new Promise((r) => servidorSmtp.close(r));
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test('recuperación de contraseña: correo -> código -> contraseña nueva', async () => {
  // 1) Sin SMTP no se solicita nada (bloqueo estricto, sin truco de dev).
  delete process.env.MAIL_HOST;
  const sinSmtp = await request(app).post('/api/auth/olvide-contrasena').send({ correo: CORREO });
  assert.equal(sinSmtp.status, 503, 'sin SMTP debe responder 503');
  assert.equal(sinSmtp.body.ok, false);
  process.env.MAIL_HOST = '127.0.0.1'; // se reactiva para el resto del test

  // 2) Solicitud con correo registrado: mensaje de confirmación + correo enviado.
  correosRecibidos = [];
  const solicitud = await request(app).post('/api/auth/olvide-contrasena').send({ correo: CORREO });
  assert.equal(solicitud.status, 200);
  assert.equal(solicitud.body.ok, true);
  assert.ok(!('enlace' in solicitud.body), 'no debe devolver enlace ni token');
  assert.equal(correosRecibidos.length, 1, 'debe enviarse un correo');
  const codigo = ultimoCodigo();
  assert.ok(codigo && /^\d{6}$/.test(codigo), 'el correo contiene un código de 6 dígitos');

  // 3) Correo inexistente: 404 con aviso + invitación a registro (decisión
  //    del usuario 2026-11-17) y NO se envía ningún correo.
  const correosAntes = correosRecibidos.length;
  const inexistente = await request(app)
    .post('/api/auth/olvide-contrasena')
    .send({ correo: 'nadie@existe.test'});
  assert.equal(inexistente.status, 404, 'correo no registrado -> 404');
  assert.equal(inexistente.body.codigo, 'CORREO_NO_REGISTRADO');
  assert.ok(
    /reg[ií]strate/i.test(inexistente.body.mensaje),
    'el mensaje invita a registrarse'
  );
  assert.equal(correosRecibidos.length, correosAntes, 'no se envía correo a un correo inexistente');

  // 4) Código malo: 400; y al 5º intento se invalida el código.
  for (let intento = 1; intento <= 5; intento += 1) {
    const malo = await request(app)
      .post('/api/auth/verificar-codigo')
      .send({ correo: CORREO, codigo: '000000' });
    assert.equal(malo.status, 400, `intento ${intento} inválido -> 400`);
  }
  // El código quedó invalidado: ni el correcto pasa ya.
  const trasBloqueo = await request(app)
    .post('/api/auth/verificar-codigo')
    .send({ correo: CORREO, codigo });
  assert.equal(trasBloqueo.status, 400, 'tras 5 intentos el código se invalida');

  // 5) Se pide un código nuevo y se verifica el correcto.
  await request(app).post('/api/auth/olvide-contrasena').send({ correo: CORREO });
  const codigo2 = ultimoCodigo();
  assert.ok(codigo2, 'llega un segundo código');
  const bueno = await request(app)
    .post('/api/auth/verificar-codigo')
    .send({ correo: CORREO, codigo: codigo2 });
  assert.equal(bueno.status, 200, 'código correcto -> 200');
  const token = bueno.body.data?.token;
  assert.ok(token && token.length >= 32, 'devuelve el token de restablecimiento');
  assert.ok(!bueno.body.mensaje.includes(codigo2), 'el mensaje no repite el código');

  // 6) El token restablece la contraseña.
  const restablecer = await request(app).post('/api/auth/restablecer-contrasena').send({
    token,
    contrasenaNueva: 'NuevaClave123',
    confirmarContrasena: 'NuevaClave123',
  });
  assert.equal(restablecer.status, 200);

  // 7) El token es de un solo uso.
  const reuso = await request(app).post('/api/auth/restablecer-contrasena').send({
    token,
    contrasenaNueva: 'OtraClave456',
    confirmarContrasena: 'OtraClave456',
  });
  assert.equal(reuso.status, 400, 'el token ya usado no sirve');

  // 8) Se puede iniciar sesión con la contraseña nueva (y no con la vieja).
  const loginNuevo = await request(app)
    .post('/api/auth/login')
    .send({ correo: CORREO, contrasena: 'NuevaClave123' });
  assert.equal(loginNuevo.status, 200, 'login con la contraseña nueva');
  const loginViejo = await request(app)
    .post('/api/auth/login')
    .send({ correo: CORREO, contrasena: CONTRASENA });
  assert.equal(loginViejo.status, 401, 'la contraseña vieja ya no entra');
  assert.ok(loginNuevo.body.token);
});
