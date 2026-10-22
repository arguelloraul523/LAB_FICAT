import Notificacion from '../models/Notificacion.js';
import { enviarCorreo } from '../utils/mailer.js';

// ============================================================
// Cola de envío de correos (RF-14, RNF-09).
// Envío asíncrono: no bloquea la respuesta HTTP. Cada trabajo reintenta
// hasta N veces con backoff y registra el resultado (estado/intentos/error)
// en su Notificacion de canal "Correo".
// ============================================================

let enviador = enviarCorreo; // inyectable en pruebas
let maxIntentosPorDefecto = 3;
let autoProgramar = true; // si false, la cola solo avanza con procesarCola()
const cola = [];
let procesando = false;

// Permite inyectar el enviador, el máximo de intentos y el modo automático.
const configurarCola = ({ enviador: fn, maxIntentos, auto } = {}) => {
  if (typeof fn === 'function') enviador = fn;
  if (Number.isInteger(maxIntentos) && maxIntentos > 0) maxIntentosPorDefecto = maxIntentos;
  if (typeof auto === 'boolean') autoProgramar = auto;
};

const dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Registra el resultado en la Notificacion de correo (best-effort).
const registrar = async (notificacionId, datos) => {
  if (!notificacionId) return;
  try {
    await Notificacion.findByIdAndUpdate(notificacionId, datos);
  } catch (err) {
    console.error(`⚠️  No se pudo registrar el resultado de la notificación: ${err.message}`);
  }
};

const procesarJob = async (job) => {
  const max = job.maxIntentos ?? maxIntentosPorDefecto;
  for (let intento = 1; intento <= max; intento++) {
    try {
      const resultado = await enviador({ para: job.para, asunto: job.asunto, texto: job.contenido });
      if (resultado === false) {
        // SMTP no configurado: no se reintenta (no es un fallo transitorio).
        await registrar(job.notificacionId, {
          estado: 'Fallido',
          intentos: intento,
          error: 'SMTP no configurado',
        });
        return false;
      }
      await registrar(job.notificacionId, {
        estado: 'Enviado',
        intentos: intento,
        error: null,
        fechaEnvio: new Date(),
      });
      return true;
    } catch (err) {
      if (intento === max) {
        await registrar(job.notificacionId, {
          estado: 'Fallido',
          intentos: intento,
          error: err.message,
        });
        console.error(`⚠️  Correo "${job.asunto}" falló tras ${intento} intento(s): ${err.message}`);
        return false;
      }
      await dormir(job.backoffMs ?? 1000 * intento);
    }
  }
  return false;
};

// Procesa la cola completa (await-able; usado por el worker y por pruebas).
const procesarCola = async () => {
  if (procesando) return;
  procesando = true;
  try {
    while (cola.length > 0) {
      const job = cola.shift();
      await procesarJob(job);
    }
  } finally {
    procesando = false;
  }
};

// Encola un correo. `programar:false` evita el setImmediate (pruebas).
const encolarCorreo = (job, { programar = autoProgramar } = {}) => {
  cola.push(job);
  if (programar) {
    setImmediate(() => {
      procesarCola().catch((err) =>
        console.error(`⚠️  Fallo procesando la cola de notificaciones: ${err.message}`)
      );
    });
  }
};

const pendientes = () => cola.length;

// ============================================================
// Drenado de correos pendientes persistidos en MongoDB.
// La cola en memoria pierde los pendientes si la app se reinicia (Render).
// Este drenado recupera las Notificacion de canal "Correo" con estado
// "Pendiente" (se guardó `para` al crearlas) y las reenvía. Lo dispara el
// arranque y el cron externo (POST /api/cron/retrasos).
//
// Guard de antigüedad: solo drena correos de hace más de `antiguedadMs`
// (default 30 s) para no duplicar los que la cola en memoria aún está
// procesando en este instante.
// ============================================================
const drenarCorreosPendientes = async ({ limite = 50, antiguedadMs = 30_000 } = {}) => {
  const umbral = new Date(Date.now() - antiguedadMs);
  const pendientesDB = await Notificacion.find({
    canal: 'Correo',
    estado: 'Pendiente',
    para: { $ne: null },
    createdAt: { $lt: umbral },
  })
    .sort({ createdAt: 1 })
    .limit(limite);

  let enviados = 0;
  for (const n of pendientesDB) {
    const ok = await procesarJob({
      notificacionId: n._id,
      para: n.para,
      asunto: n.asunto,
      contenido: n.contenido,
    });
    if (ok) enviados += 1;
  }
  return { pendientes: pendientesDB.length, enviados };
};

export { encolarCorreo, procesarCola, configurarCola, pendientes, drenarCorreosPendientes };
