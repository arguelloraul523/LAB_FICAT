import crypto from 'crypto';
import asyncHandler from '../utils/asyncHandler.js';
import bcrypt from 'bcryptjs';
import { generarToken } from '../utils/tokens.js';
import Usuario from '../models/Usuario.js';
import Rol from '../models/Rol.js';
import TipologiaCliente from '../models/TipologiaCliente.js';
import { enviarCorreo, smtpConfigurado } from '../utils/mailer.js';
import { resolverPlantilla } from '../services/notificaciones.service.js';
import { renderPlantilla } from '../services/plantillas.service.js';

// Registro de un nuevo usuario (devuelve el token de acceso)
const registrar = asyncHandler(async (req, res) => {
  const {
    contrasena,
    nombres,
    apellidos,
    tipoDocumento,
    numeroDocumento,
    correo,
    telefono,
    tipologia,
    razonSocial,
    direccion,
    ciudad,
    departamento,
    cargo,
    personaContacto,
  } = req.body;
  const contrasenaHash = await bcrypt.hash(contrasena, 10);

  // El rol y el tipo de usuario NUNCA se aceptan desde el body (regla inviolable #12, RF-02).
  // Todo registro público nace como Cliente externo; el Administrador asigna otros roles.
  const rolCliente = await Rol.findOne({ nombre: 'Cliente' });
  if (!rolCliente) {
    return res.status(500).json({ ok: false, mensaje: 'Falta el rol Cliente. Ejecuta el seed.' });
  }

  const usuarioCreado = await Usuario.create({
    nombres,
    apellidos,
    tipoDocumento,
    numeroDocumento,
    correo,
    telefono,
    tipologia,
    razonSocial,
    direccion,
    ciudad,
    departamento,
    cargo,
    personaContacto,
    rol: rolCliente._id,
    roles: [rolCliente._id],
    tipoUsuario: 'EXTERNO',
    contrasenaHash,
  });
  const usuario = usuarioCreado.toObject();
  delete usuario.contrasenaHash;

  const token = generarToken({ id: usuario._id });
  res.status(201).json({ ok: true, data: usuario, token });
});

// Inicio de sesión con correo y contraseña
const login = asyncHandler(async (req, res) => {
  const { correo, contrasena } = req.body;

  const usuario = await Usuario.findOne({ correo: String(correo).trim().toLowerCase() }).select(
    '+contrasenaHash'
  );
  if (!usuario) {
    return res.status(401).json({ ok: false, mensaje: 'Credenciales incorrectas' });
  }

  // Un usuario desactivado no puede iniciar sesión.
  if (!usuario.activo) {
    return res.status(401).json({ ok: false, mensaje: 'Usuario inactivo' });
  }

  const valida = await bcrypt.compare(contrasena, usuario.contrasenaHash);
  if (!valida) {
    return res.status(401).json({ ok: false, mensaje: 'Credenciales incorrectas' });
  }

  const datos = usuario.toObject();
  delete datos.contrasenaHash;

  const token = generarToken({ id: usuario._id });
  res.json({ ok: true, data: datos, token });
});

// Devuelve el usuario autenticado (req.usuario lo carga el middleware)
const perfil = asyncHandler(async (req, res) => {
  res.json({ ok: true, data: req.usuario });
});

// Cambia la contraseña del usuario autenticado
const cambiarContrasena = asyncHandler(async (req, res) => {
  const { contrasenaActual, contrasenaNueva } = req.body;

  const usuario = await Usuario.findById(req.usuario._id).select('+contrasenaHash');
  const valida = await bcrypt.compare(contrasenaActual, usuario.contrasenaHash);
  if (!valida) {
    return res.status(400).json({ ok: false, mensaje: 'Contraseña actual incorrecta' });
  }

  usuario.contrasenaHash = await bcrypt.hash(contrasenaNueva, 10);
  await usuario.save();

  res.json({ ok: true, mensaje: 'Contraseña actualizada correctamente' });
});

// Hashea el token de recuperación antes de guardarlo (mismo criterio que la
// contraseña: nunca en texto plano en la BD).
const hashearToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

// Solicita recuperación de contraseña: genera un código de 6 dígitos y lo
// envía por correo. Si el correo NO existe responde 404 invitando a
// registrarse (decisión del usuario 2026-11-17: prefiere avisar al usuario
// aunque eso revele si hay cuenta; el authLimiter limita el abuso). Sin SMTP
// configurado responde 503 antes de buscar el usuario.
const olvideContrasena = asyncHandler(async (req, res) => {
  const { correo } = req.body;

  if (!smtpConfigurado()) {
    return res.status(503).json({
      ok: false,
      mensaje:
        'El servicio de correo no está configurado. Completa MAIL_HOST, MAIL_USER y MAIL_PASS en el archivo .env del backend.',
    });
  }

  const usuario = await Usuario.findOne({ correo: String(correo).trim().toLowerCase() });
  if (!usuario) {
    // Aviso explícito + invitación a registro (decisión del usuario 2026-11-17).
    return res.status(404).json({
      ok: false,
      codigo: 'CORREO_NO_REGISTRADO',
      mensaje: 'No existe una cuenta con ese correo. Si aún no tienes cuenta, regístrate primero.',
    });
  }

  const mensaje = 'Código de verificación enviado a tu correo';

  // Código de 6 dígitos (numérico para que el usuario lo teclee sin errores).
  const codigo = String(crypto.randomInt(100000, 1000000));

  // Se guarda hasheado (sha256) como el token: ni el código ni un eventual
  // volcado de la BD permiten reutilizarlo. Se invalida cualquier token previo.
  usuario.codigoRecuperacion = hashearToken(codigo);
  usuario.codigoExpiracion = Date.now() + 10 * 60 * 1000; // 10 minutos
  usuario.codigoIntentos = 0;
  usuario.tokenRecuperacion = null;
  usuario.tokenExpiracion = null;
  await usuario.save();

  // Plantilla editable desde el panel (RF-14): se lee de la BD en CADA
  // envío (sin caché), así que editarla cambia el siguiente correo sin
  // reiniciar. Si no hubiera plantilla (BD sin seed) usa el respaldo.
  const plantilla = await resolverPlantilla('recuperacion-contrasena');
  const variables = {
    nombre: usuario.nombres || '',
    codigo,
    minutos: 10,
    fecha: new Date().toLocaleString('es-CO'),
  };
  const asunto = renderPlantilla(plantilla.asunto, variables);
  const cuerpo = renderPlantilla(plantilla.cuerpo, variables);
  // Si el cuerpo es HTML se envía como diseño; si no, es texto plano.
  const esHtml = /<[a-z][^>]*>/i.test(cuerpo);
  const texto = esHtml ? cuerpo.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : cuerpo;

  // Envío SÍNCRONO (no la cola): si falla el correo el usuario ve el error
  // al instante y no avanza al paso 2 esperando un código que nunca llega.
  try {
    await enviarCorreo({
      para: usuario.correo,
      asunto,
      texto,
      html: esHtml ? cuerpo : undefined,
    });
  } catch (e) {
    console.error('Error enviando código de recuperación:', e.message);
    return res.status(500).json({
      ok: false,
      mensaje: 'No se pudo enviar el correo de verificación. Intenta de nuevo en unos minutos.',
    });
  }

  res.json({ ok: true, mensaje });
});

// Verifica el código de 6 dígitos y, si es correcto, emite un token temporal
// de restablecimiento (32 bytes, guardado hasheado). El token solo se devuelve
// aquí, después de comprobar que el usuario recibió el correo.
const verificarCodigo = asyncHandler(async (req, res) => {
  const { correo, codigo } = req.body;
  const mensajeError = 'Código inválido o expirado';

  const usuario = await Usuario.findOne({ correo: String(correo).trim().toLowerCase() });
  // Mismo mensaje si el correo no existe, si el código no coincide o si
  // expiró: la respuesta no distingue los casos (anti-enumeración).
  if (!usuario || !usuario.codigoRecuperacion || !usuario.codigoExpiracion) {
    return res.status(400).json({ ok: false, mensaje: mensajeError });
  }
  if (Date.now() > new Date(usuario.codigoExpiracion).getTime()) {
    return res.status(400).json({ ok: false, mensaje: mensajeError });
  }
  if (usuario.codigoIntentos >= 5) {
    return res.status(400).json({ ok: false, mensaje: mensajeError });
  }

  if (usuario.codigoRecuperacion !== hashearToken(codigo)) {
    // Cada error acerca el código al bloqueo (RF: fuerza bruta sobre 6 dígitos).
    usuario.codigoIntentos += 1;
    if (usuario.codigoIntentos >= 5) {
      usuario.codigoRecuperacion = null;
      usuario.codigoExpiracion = null;
    }
    await usuario.save();
    return res.status(400).json({ ok: false, mensaje: mensajeError });
  }

  // Código correcto: se emite el token de restablecimiento (10 minutos).
  const token = crypto.randomBytes(32).toString('hex');
  usuario.codigoRecuperacion = null;
  usuario.codigoExpiracion = null;
  usuario.codigoIntentos = 0;
  usuario.tokenRecuperacion = hashearToken(token);
  usuario.tokenExpiracion = Date.now() + 10 * 60 * 1000;
  await usuario.save();

  res.json({ ok: true, data: { token }, mensaje: 'Código verificado. Ahora define tu nueva contraseña.' });
});

// Restablece la contraseña usando el token recibido
const restablecerContrasena = asyncHandler(async (req, res) => {
  const { token, contrasenaNueva } = req.body;

  const usuario = await Usuario.findOne({
    tokenRecuperacion: hashearToken(token),
    tokenExpiracion: { $gt: Date.now() },
  });
  if (!usuario) {
    return res.status(400).json({ ok: false, mensaje: 'Token inválido o expirado' });
  }

  usuario.contrasenaHash = await bcrypt.hash(contrasenaNueva, 10);
  usuario.tokenRecuperacion = null;
  usuario.tokenExpiracion = null;
  await usuario.save();

  res.json({ ok: true, mensaje: 'Contraseña restablecida correctamente' });
});

// Cambia el rol ACTIVO de la sesión (multirrol). Solo acepta roles disponibles.
const cambiarRol = asyncHandler(async (req, res) => {
  const { rol } = req.body;

  const disponibles = (req.usuario.roles || []).map((r) => String(r._id || r));
  if (!rol || !disponibles.includes(String(rol))) {
    return res.status(403).json({ ok: false, mensaje: 'Ese rol no está disponible para tu usuario' });
  }

  const actualizado = await Usuario.findByIdAndUpdate(req.usuario._id, { rol }, { new: true })
    .populate('rol')
    .select('-contrasenaHash');

  res.json({ ok: true, data: actualizado });
});

// RF-04: el usuario selecciona su tipología de cliente (obligatoria al
// solicitar un análisis por primera vez). Solo admite tipologías existentes.
const actualizarTipologia = asyncHandler(async (req, res) => {
  const tipologia = await TipologiaCliente.findById(req.body.tipologia);
  if (!tipologia) {
    return res.status(400).json({ ok: false, mensaje: 'Tipología no válida' });
  }

  req.usuario.tipologia = tipologia._id;
  await req.usuario.save();

  res.json({ ok: true, data: req.usuario });
});

// Actualiza los datos propios del perfil (nombres, contacto, dirección,
// tipología). NUNCA rol/roles/tipoUsuario/activo/correo/documento (regla #12):
// se aplica una whitelist explícita de campos.
const CAMPOS_PERFIL = [
  'nombres',
  'apellidos',
  'telefono',
  'direccion',
  'ciudad',
  'departamento',
  'cargo',
  'personaContacto',
  'razonSocial',
  'tipologia',
];

const actualizarPerfil = asyncHandler(async (req, res) => {
  const datos = {};
  for (const campo of CAMPOS_PERFIL) {
    if (req.body[campo] !== undefined) datos[campo] = req.body[campo];
  }

  const actualizado = await Usuario.findByIdAndUpdate(req.usuario._id, datos, {
    new: true,
    runValidators: true,
  })
    .populate('rol')
    .populate('tipologia')
    .select('-contrasenaHash');

  if (!actualizado) {
    return res.status(404).json({ ok: false, mensaje: 'Usuario no encontrado' });
  }

  res.json({ ok: true, data: actualizado });
});

export {
  registrar,
  login,
  perfil,
  cambiarContrasena,
  olvideContrasena,
  verificarCodigo,
  restablecerContrasena,
  cambiarRol,
  actualizarTipologia,
  actualizarPerfil,
};
