import nodemailer from 'nodemailer';

// ¿Hay credenciales SMTP completas en .env? (no envía nada, solo consulta)
const smtpConfigurado = () =>
  Boolean(process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS);

// Crea el transporter SOLO si hay configuración SMTP en .env
const crearTransporter = () => {
  if (!smtpConfigurado()) {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
};

// Envía un correo. Si el SMTP no está configurado, devuelve false
// y registra el mensaje en consola (útil en desarrollo).
const enviarCorreo = async ({ para, asunto, texto, html }) => {
  const transporter = crearTransporter();
  if (!transporter) {
    console.log(`📧 [SMTP no configurado] Para: ${para} | Asunto: ${asunto}`);
    return false;
  }

  await transporter.sendMail({
    from: `"LABFICAT" <${process.env.MAIL_USER}>`,
    to: para,
    subject: asunto,
    text: texto,
    html,
  });
  return true;
};

export { enviarCorreo, smtpConfigurado };
