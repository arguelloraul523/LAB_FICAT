// ============================================================
// Motor de correo multi-proveedor (RF-14, RNF-09).
//
// Interfaz pública (igual que antes, para no romper a la cola ni a los
// controladores):
//   enviarCorreo({ para, asunto, texto, html }) -> boolean
//     true  = entregado al proveedor
//     false = NO configurado (no es un fallo transitorio; no reintenta)
//     lanza = fallo transitorio (la cola reintenta con backoff)
//   smtpConfigurado() -> boolean
//
// Por qué varios proveedores: el entorno en el que corre este proyecto
// (SENA / centro agroturístico) bloquea los puertos SMTP (587/465), así que
// el canal preferido es **API HTTP por HTTPS 443** (abierto en casi todas las
// redes) y el SMTP queda como respaldo.
//
// Canal principal (2026-11-19): **Gmail API de Google Cloud** por OAuth2
// (refresh token). Sale por 443, no necesita App Password ni SMTP y funciona
// igual en local que en Render.
//
// Configuración (una sola por ejecución, en `.env`):
//   MAIL_PROVIDER   gmailapi | sendgrid | brevo | mailgun | gmail | smtp
//   Gmail API (OAuth2): GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET,
//                   GMAIL_REFRESH_TOKEN y (opcional) GMAIL_FROM
//   Para API HTTP:  SENDGRID_API_KEY / BREVO_API_KEY /
//                   MAILGUN_API_KEY + MAILGUN_DOMINIO
//   Para SMTP:      MAIL_HOST, MAIL_PORT (587/465), MAIL_USER, MAIL_PASS,
//                   MAIL_SECURE (true|false) y MAIL_FROM (remitente opcional)
// ============================================================
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';

// Proveedores: canal = 'gmail' (API de Google) | 'api' (HTTP genérico) |
// 'smtp' (transporte SMTP de respaldo).
const PROVEEDORES = {
  gmailapi: {
    nombre: 'Gmail API (Google Cloud)',
    canal: 'gmail',
    requerir: ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN'],
  },
  sendgrid: {
    nombre: 'SendGrid',
    canal: 'api',
    api: 'https://api.sendgrid.com/v3/mail/send',
    requerir: ['SENDGRID_API_KEY'],
  },
  brevo: {
    nombre: 'Brevo (Sendinblue)',
    canal: 'api',
    api: 'https://api.brevo.com/v3/smtp/email',
    requerir: ['BREVO_API_KEY'],
  },
  mailgun: {
    nombre: 'Mailgun',
    canal: 'api',
    // El dominio se inyecta en la URL: https://api.mailgun.net/v3/<dominio>/messages
    api: 'https://api.mailgun.net/v3/%DOMINIO%/messages',
    requerir: ['MAILGUN_API_KEY', 'MAILGUN_DOMINIO'],
  },
  gmail: { nombre: 'Gmail SMTP', canal: 'smtp' },
  smtp: { nombre: 'SMTP genérico', canal: 'smtp' },
};

const TIMEOUT_API_MS = 20_000;
const TIMEOUT_SMTP_MS = 15_000;
const MAX_INTENTOS = 2;
const BACKOFF_MS = 1500;

// Endpoints de Google (OAuth2 + Gmail API).
const URL_TOKEN_GOOGLE = 'https://oauth2.googleapis.com/token';
const URL_PERFIL_GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me/profile';
const URL_ENVIO_GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

const dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================
// Proveedor seleccionado
// ============================================================
const proveedorActual = () => {
  const nombre = (process.env.MAIL_PROVIDER || '').trim().toLowerCase();
  if (nombre) return PROVEEDORES[nombre] || null;
  // Autodetección: el que tenga credenciales completas. El Gmail API va
  // primero porque es el canal principal del proyecto.
  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) {
    return PROVEEDORES.gmailapi;
  }
  if (process.env.SENDGRID_API_KEY) return PROVEEDORES.sendgrid;
  if (process.env.BREVO_API_KEY) return PROVEEDORES.brevo;
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMINIO) return PROVEEDORES.mailgun;
  if (process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS) {
    return PROVEEDORES.smtp;
  }
  return null;
};

const faltanCredenciales = (proveedor) => {
  if (!proveedor) return ['MAIL_PROVIDER'];
  return (proveedor.requerir || []).filter((clave) => !process.env[clave]);
};

// El remitente: MAIL_FROM si existe, si no el usuario SMTP o un dominio neutral.
const remitente = () =>
  process.env.MAIL_FROM ||
  process.env.MAIL_USER ||
  'LABFICAT <notificaciones@labficat.local>';

// ============================================================
// Canal API HTTP (SendGrid / Brevo / Mailgun) — HTTPS 443
// ============================================================
const enviarPorApi = async (proveedor, { para, asunto, texto, html }) => {
  const apiKey = process.env.SENDGRID_API_KEY || process.env.BREVO_API_KEY || process.env.MAILGUN_API_KEY;
  const desde = remitente();
  const url = proveedor.api.replace('%DOMINIO%', process.env.MAILGUN_DOMINIO || '');

  let cuerpo;
  if (proveedor.nombre === 'SendGrid') {
    cuerpo = {
      personalizations: [{ to: [{ email: para }] }],
      from: { email: desde.includes('<') ? desde.split('<')[1].replace('>', '').trim() : desde },
      subject: asunto,
      content: [
        ...(texto ? [{ type: 'text/plain', value: texto }] : []),
        ...(html ? [{ type: 'text/html', value: html }] : []),
      ],
    };
  } else if (proveedor.nombre === 'Brevo (Sendinblue)') {
    cuerpo = {
      sender: { email: desde.includes('<') ? desde.split('<')[1].replace('>', '').trim() : desde },
      to: [{ email: para }],
      subject: asunto,
      ...(texto ? { textContent: texto } : {}),
      ...(html ? { htmlContent: html } : {}),
    };
  } else {
    // Mailgun (formData: requiere URLSearchParams, no JSON).
    const form = new URLSearchParams();
    form.append('from', desde);
    form.append('to', para);
    form.append('subject', asunto);
    if (texto) form.append('text', texto);
    if (html) form.append('html', html);
    cuerpo = form;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}` },
      body: cuerpo,
      signal: AbortSignal.timeout(TIMEOUT_API_MS),
    });
    if (!resp.ok) {
      const detalle = await resp.text().catch(() => '');
      throw new Error(`API ${proveedor.nombre} respondió ${resp.status}: ${detalle.slice(0, 200)}`);
    }
    return true;
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(TIMEOUT_API_MS),
  });
  if (!resp.ok) {
    const detalle = await resp.text().catch(() => '');
    throw new Error(`API ${proveedor.nombre} respondió ${resp.status}: ${detalle.slice(0, 200)}`);
  }
  return true;
};

// ============================================================
// Canal SMTP (Gmail / genérico) — respaldo
// ============================================================
const transporterSmtp = () => {
  const port = Number(process.env.MAIL_PORT) || 587;
  const secure =
    process.env.MAIL_SECURE !== undefined
      ? process.env.MAIL_SECURE === 'true'
      : port === 465;
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port,
    secure,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
    // Sin esto, un puerto bloqueado hace esperar 2 minutos al proceso.
    timeout: TIMEOUT_SMTP_MS,
    connectionTimeout: TIMEOUT_SMTP_MS,
    greetingTimeout: TIMEOUT_SMTP_MS,
  });
};

const enviarPorSmtp = async ({ para, asunto, texto, html }) => {
  const transporter = transporterSmtp();
  await transporter.sendMail({
    from: remitente(),
    to: para,
    subject: asunto,
    text: texto,
    html,
  });
  return true;
};

// ============================================================
// Canal Gmail API (Google Cloud) por OAuth2 — HTTPS 443
// ============================================================
// Access token en memoria: Google lo emite por ~1 h y se renueva solo.
let cacheTokenGmail = { valor: null, expiraEn: 0 };
const MARGEN_RENOVACION_MS = 60_000; // se renueva 1 minuto antes de vencer

const obtenerTokenGmail = async () => {
  if (cacheTokenGmail.valor && Date.now() < cacheTokenGmail.expiraEn - MARGEN_RENOVACION_MS) {
    return cacheTokenGmail.valor;
  }

  const resp = await fetch(URL_TOKEN_GOOGLE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    }),
    signal: AbortSignal.timeout(TIMEOUT_API_MS),
  });
  const datos = await resp.json().catch(() => ({}));

  if (!resp.ok || !datos.access_token) {
    // invalid_grant = refresh token revocado o expirado: no es transitorio,
    // se limpia la caché para que el próximo intento reintente desde cero.
    cacheTokenGmail = { valor: null, expiraEn: 0 };
    const causa = datos.error_description || datos.error || `HTTP ${resp.status}`;
    throw new Error(
      `Google rechazó el refresh token (${causa}). Regenera GMAIL_REFRESH_TOKEN en el .env.`
    );
  }

  cacheTokenGmail = {
    valor: datos.access_token,
    expiraEn: Date.now() + Number(datos.expires_in ?? 3600) * 1000,
  };
  return cacheTokenGmail.valor;
};

// Remitente: GMAIL_FROM / MAIL_FROM si existe; si no, la dirección de la
// cuenta autenticada (leída una sola vez de la API y cacheada). Gmail rechaza
// un From que no sea la cuenta autenticada ni un alias verificado.
let correoGmailCacheado = null;
const remitenteGmail = async (token) => {
  const explicito = process.env.GMAIL_FROM || process.env.MAIL_FROM;
  if (explicito) return explicito;
  if (correoGmailCacheado) return correoGmailCacheado;

  try {
    const resp = await fetch(URL_PERFIL_GMAIL, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_API_MS),
    });
    if (resp.ok) {
      const perfil = await resp.json().catch(() => null);
      if (perfil?.emailAddress) {
        correoGmailCacheado = perfil.emailAddress;
        return correoGmailCacheado;
      }
    }
  } catch {
    // Sin red o sin permiso: se cae al remitente de respaldo de abajo.
  }
  return process.env.MAIL_USER || 'LABFICAT <lab.ficatt@gmail.com>';
};

// Codifica una cabecera solo si trae tildes/ñ (RFC 2047, UTF-8 base64).
const codificarCabecera = (valor) =>
  /[^\x20-\x7E]/.test(valor) ? `=?UTF-8?B?${Buffer.from(valor, 'utf8').toString('base64')}?=` : valor;

// Mensaje RFC 2822 listo para `raw` de la Gmail API. Con texto y HTML se
// envía `multipart/alternative` para que el cliente elija la versión.
const construirMensajeGmail = ({ para, asunto, texto, html, desde }) => {
  const partes = [];
  if (texto) partes.push({ tipo: 'text/plain', cuerpo: texto });
  if (html) partes.push({ tipo: 'text/html', cuerpo: html });
  if (partes.length === 0) partes.push({ tipo: 'text/plain', cuerpo: '' });

  const cabeceras = [
    `From: ${codificarCabecera(desde)}`,
    `To: ${codificarCabecera(para)}`,
    `Subject: ${codificarCabecera(asunto || '')}`,
    'MIME-Version: 1.0',
  ];

  let cuerpo;
  if (partes.length === 1) {
    cabeceras.push(`Content-Type: ${partes[0].tipo}; charset="UTF-8"`);
    cabeceras.push('Content-Transfer-Encoding: 8bit');
    cuerpo = partes[0].cuerpo;
  } else {
    const limite = `=${crypto.randomBytes(16).toString('hex')}=`;
    cabeceras.push(`Content-Type: multipart/alternative; boundary="${limite}"`);
    cuerpo =
      partes
        .map(
          (p) =>
            `--${limite}\r\n` +
            `Content-Type: ${p.tipo}; charset="UTF-8"\r\n` +
            'Content-Transfer-Encoding: 8bit\r\n\r\n' +
            p.cuerpo
        )
        .join('\r\n\r\n') + `\r\n--${limite}--`;
  }

  return `${cabeceras.join('\r\n')}\r\n\r\n${cuerpo}`;
};

const enviarPorGmailApi = async ({ para, asunto, texto, html }) => {
  const token = await obtenerTokenGmail();
  const desde = await remitenteGmail(token);
  const raw = Buffer.from(
    construirMensajeGmail({ para, asunto, texto, html, desde }),
    'utf8'
  ).toString('base64url');

  const resp = await fetch(URL_ENVIO_GMAIL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
    signal: AbortSignal.timeout(TIMEOUT_API_MS),
  });
  const datos = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    // 401 = token caducado entre llamadas: se limpia para que el reintento
    // pida uno nuevo en lugar de volver a usar el mismo.
    if (resp.status === 401) cacheTokenGmail = { valor: null, expiraEn: 0 };
    const causa = datos.error?.message || datos.error || datos.error_description || `HTTP ${resp.status}`;
    throw new Error(`Gmail API respondió ${resp.status}: ${causa}`);
  }
  return true;
};

// ============================================================
// API pública
// ============================================================
const enviarCorreo = async ({ para, asunto, texto, html }) => {
  if (!para) return false;

  const proveedor = proveedorActual();
  if (!proveedor) {
    console.log(`📧 [Correo no configurado] Para: ${para} | Asunto: ${asunto}`);
    return false;
  }

  // Reintento con backoff: un timeout de red es transitorio.
  let ultimoError = null;
  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    try {
      if (proveedor.canal === 'smtp') {
        await enviarPorSmtp({ para, asunto, texto, html });
      } else if (proveedor.canal === 'gmail') {
        await enviarPorGmailApi({ para, asunto, texto, html });
      } else {
        await enviarPorApi(proveedor, { para, asunto, texto, html });
      }
      return true;
    } catch (err) {
      ultimoError = err;
      if (intento < MAX_INTENTOS) await dormir(BACKOFF_MS * intento);
    }
  }

  // Fallo transitorio: se lanza para que la cola registre el error y reintente.
  const detalle =
    proveedor.canal === 'smtp'
      ? `${process.env.MAIL_HOST || 'SMTP'}:${process.env.MAIL_PORT || 587}`
      : proveedor.nombre;
  const causa = ultimoError?.code || ultimoError?.message || 'desconocido';
  console.error(`📧 [Correo falló] ${proveedor.nombre} | ${para} | ${causa}`);
  throw new Error(`Fallo de correo vía ${detalle}: ${causa}`);
};

// ¿Hay un proveedor configurado y con credenciales completas?
const smtpConfigurado = () => {
  const proveedor = proveedorActual();
  if (!proveedor) return false;
  return faltanCredenciales(proveedor).length === 0;
};

// Diagnóstico para el panel/consola (no envía nada).
const estadoCorreo = () => {
  const proveedor = proveedorActual();
  const faltan = faltanCredenciales(proveedor);
  const canal = proveedor?.canal;
  return {
    proveedor: proveedor?.nombre || null,
    tipo: canal === 'smtp' ? 'SMTP' : canal === 'gmail' ? 'Gmail API (OAuth2, 443)' : 'API HTTP (443)',
    configurado: Boolean(proveedor) && faltan.length === 0,
    faltan,
    // En el canal Gmail el From puede salir del perfil de la cuenta.
    remitente: canal === 'gmail' ? process.env.GMAIL_FROM || remitente() : remitente(),
  };
};

export { enviarCorreo, smtpConfigurado, estadoCorreo };
