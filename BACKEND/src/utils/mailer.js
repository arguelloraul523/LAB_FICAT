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
// (SENA / centro agroturístico) bloquea los puertos SMTP (587/465) y Gmail
// exige App Password; por eso el canal preferido es **API HTTP por HTTPS 443**
// (abierto en casi todas las redes) y el SMTP queda como respaldo.
//
// Configuración (una sola por ejecución, en `.env`):
//   MAIL_PROVIDER   sendgrid | brevo | mailgun | gmail | smtp
//   Para API HTTP:  SENDGRID_API_KEY / BREVO_API_KEY /
//                   MAILGUN_API_KEY + MAILGUN_DOMINIO
//   Para SMTP:      MAIL_HOST, MAIL_PORT (587/465), MAIL_USER, MAIL_PASS,
//                   MAIL_SECURE (true|false) y MAIL_FROM (remitente opcional)
// ============================================================
import nodemailer from 'nodemailer';

// Proveedores: api = URL de la API HTTP; smtp = usar transporte SMTP.
const PROVEEDORES = {
  sendgrid: {
    nombre: 'SendGrid',
    api: 'https://api.sendgrid.com/v3/mail/send',
    requerir: ['SENDGRID_API_KEY'],
  },
  brevo: {
    nombre: 'Brevo (Sendinblue)',
    api: 'https://api.brevo.com/v3/smtp/email',
    requerir: ['BREVO_API_KEY'],
  },
  mailgun: {
    nombre: 'Mailgun',
    // El dominio se inyecta en la URL: https://api.mailgun.net/v3/<dominio>/messages
    api: 'https://api.mailgun.net/v3/%DOMINIO%/messages',
    requerir: ['MAILGUN_API_KEY', 'MAILGUN_DOMINIO'],
  },
  gmail: { nombre: 'Gmail SMTP', smtp: true },
  smtp: { nombre: 'SMTP genérico', smtp: true },
};

const TIMEOUT_API_MS = 20_000;
const TIMEOUT_SMTP_MS = 15_000;
const MAX_INTENTOS = 2;
const BACKOFF_MS = 1500;

const dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================
// Proveedor seleccionado
// ============================================================
const proveedorActual = () => {
  const nombre = (process.env.MAIL_PROVIDER || '').trim().toLowerCase();
  if (nombre) return PROVEEDORES[nombre] || null;
  // Autodetección: el que tenga credenciales completas.
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
// API pública
// ============================================================
const enviarCorreo = async ({ para, asunto, texto, html }) => {
  if (!para) return false;

  const proveedor = proveedorActual();
  if (!proveedor) {
    console.log(`📧 [SMTP no configurado] Para: ${para} | Asunto: ${asunto}`);
    return false;
  }

  // Reintento con backoff: un timeout de red es transitorio.
  let ultimoError = null;
  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    try {
      if (proveedor.smtp) {
        await enviarPorSmtp({ para, asunto, texto, html });
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
  const detalle = proveedor.smtp
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
  return {
    proveedor: proveedor?.nombre || null,
    tipo: proveedor?.smtp ? 'SMTP' : 'API HTTP (443)',
    configurado: Boolean(proveedor) && faltan.length === 0,
    faltan,
    remitente: remitente(),
  };
};

export { enviarCorreo, smtpConfigurado, estadoCorreo };
