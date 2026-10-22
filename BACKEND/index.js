// ============================================================
// Punto de entrada único del backend (junto a .env).
// Carga el entorno, configura Express, conecta a MongoDB
// y arranca el servidor. Con el flag --seed ejecuta la siembra.
//
//   npm start          -> arranca el servidor
//   npm run seed       -> node index.js --seed
// ============================================================
import 'dotenv/config';

import { fileURLToPath } from 'url';

import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';

import rutasApi from './src/routes/index.js';
import { conectarDB, desconectarDB } from './src/config/db.js';
import { notFound, manejadorErrores } from './src/middlewares/error.middleware.js';
import Rol from './src/models/Rol.js';
import Modulo from './src/models/Modulo.js';
import TipologiaCliente from './src/models/TipologiaCliente.js';
import PlantillaMensaje from './src/models/PlantillaMensaje.js';
import ParametroSistema from './src/models/ParametroSistema.js';
import Usuario from './src/models/Usuario.js';
import { iniciarCron } from './src/services/cron.service.js';
import { drenarCorreosPendientes } from './src/services/colaNotificaciones.service.js';

// En ESM no existe __dirname: se deriva de la ubicación del módulo.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3000;
const esModoSeed = process.argv.includes('--seed');

// ============================================================
// Aplicación Express
// ============================================================
const app = express();

// Detrás de un proxy (Render/Heroku), req.ip debe ser la IP real del cliente;
// sin esto el rate-limit y la IP de la firma quedarían mal registrados.
app.set('trust proxy', 1);

// Middlewares globales
// Helmet añade cabeceras de seguridad; se permite cargar archivos (/uploads) desde el front.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Archivos subidos (comprobantes, informes, firmas, etc.)
// Carpetas sensibles: NO se sirven con /uploads. El PDF de la cotización, la
// firma digital, los informes, los comprobantes de pago, los soportes de
// verificación SENA, las evidencias y las actas solo salen por sus endpoints
// con propiedad/autorización (RF-06, RF-13, RF-20, RF-25, RF-26, RNF-01).
const CARPETAS_PROTEGIDAS = new Set([
  'cotizaciones',
  'firmas',
  'informes',
  'comprobantes',
  'verificacion-sena',
  'evidencias',
  'soportes-pqr',
  'rechazos',
]);
app.use('/uploads', (req, res, next) => {
  const carpeta = (req.path.split('/')[1] || '').toLowerCase();
  if (CARPETAS_PROTEGIDAS.has(carpeta)) {
    return res
      .status(403)
      .json({ ok: false, mensaje: 'Archivo protegido: use el endpoint autorizado' });
  }
  next();
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ruta de estado de la API
app.get('/', (req, res) => {
  res.json({
    nombre: 'Sistema de Gestión del Laboratorio (SENA)',
    estado: 'API en funcionamiento 🧪',
  });
});

// Rutas de la API + manejo de rutas no encontradas y errores
app.use('/api', rutasApi);
app.use(notFound);
app.use(manejadorErrores);

// ============================================================
// Seed (datos iniciales): npm run seed  ->  node index.js --seed
// ============================================================
const correrSeed = async () => {
  // 1. Módulos del sistema
  const nombresModulos = [
    'Usuarios',
    'Roles',
    'Catálogo',
    'Solicitudes',
    'Cotizaciones',
    'Pagos',
    'Muestras',
    'Informes',
    'Encuestas',
    'Notificaciones',
    'Configuración',
    'Inconformidades',
  ];
  const modulos = [];
  for (const nombre of nombresModulos) {
    const modulo = await Modulo.findOneAndUpdate(
      { nombre },
      { nombre, ruta: `/${nombre.toLowerCase()}`, estado: 'Activo' },
      { upsert: true, new: true, runValidators: true }
    );
    modulos.push(modulo);
  }

  // 2. Roles
  const rolesDef = [
    { nombre: 'Administrador', descripcion: 'Acceso total al sistema' },
    { nombre: 'Recepcionista', descripcion: 'Recibe muestras y gestiona solicitudes' },
    { nombre: 'Analista', descripcion: 'Procesa muestras y genera resultados' },
    { nombre: 'Cliente', descripcion: 'Solicita análisis y consulta resultados' },
  ];
  const roles = {};
  for (const r of rolesDef) {
    const rol = await Rol.findOneAndUpdate(
      { nombre: r.nombre },
      { ...r, estado: 'Activo', modulos: modulos.map((m) => m._id) },
      { upsert: true, new: true, runValidators: true }
    );
    roles[r.nombre] = rol;
  }

  // 3. Tipologías de cliente (RF-04)
  const nombresTipologias = [
    'Persona natural',
    'Productor agropecuario / local',
    'Empresa industrial o comercial',
    'Institución educativa / investigador',
    'Entidad pública',
    'Aprendiz / funcionario SENA',
  ];
  for (const nombre of nombresTipologias) {
    await TipologiaCliente.findOneAndUpdate(
      { nombre },
      { nombre },
      { upsert: true, new: true, runValidators: true }
    );
  }

  // 4. Usuario administrador
  const correo = process.env.ADMIN_CORREO || 'admin@laboratorio.com';
  const contrasena = process.env.ADMIN_CONTRASENA || 'Admin1234';
  const contrasenaHash = await bcrypt.hash(contrasena, 10);

  await Usuario.findOneAndUpdate(
    { correo },
    {
      rol: roles['Administrador']._id,
      roles: [roles['Administrador']._id],
      nombres: 'Administrador',
      apellidos: 'Sistema',
      tipoDocumento: 'CC',
      numeroDocumento: '0000000000',
      correo,
      telefono: '3000000000',
      contrasenaHash,
      tipoUsuario: 'SENA',
      activo: true,
      fechaRegistro: new Date(),
    },
    { upsert: true, new: true, runValidators: true }
  );

  // 5. Plantillas de notificación por defecto (RF-14) y parámetros (RF-32).
  // Se usa $setOnInsert: re-sembrar NO sobrescribe lo que el Admin editó.
  const plantillasDef = [
    {
      codigo: 'pago-aprobado',
      nombre: 'Pago aprobado',
      tipo: 'Notificación',
      canal: 'Ambos',
      asunto: 'Pago aprobado - instrucciones de muestra',
      cuerpo:
        'Hola {{nombre}}, tu pago fue verificado y aprobado. Tu solicitud {{orden}} ya está ' +
        'registrada como pagada; puedes acercarte a recepción para entregar tu muestra.\n\n' +
        'INSTRUCCIONES DE MUESTRA\n{{instrucciones}}',
    },
    {
      codigo: 'pago-rechazado',
      nombre: 'Pago rechazado',
      tipo: 'Notificación',
      canal: 'Ambos',
      asunto: 'Pago rechazado',
      cuerpo:
        'Hola {{nombre}}, tu pago de la solicitud {{orden}} fue rechazado.\n\n' +
        'Motivo: {{motivo}}\n\nPuedes reportar un nuevo comprobante desde "Mis pagos".',
    },
    {
      codigo: 'muestra-rechazada',
      nombre: 'Muestra rechazada',
      tipo: 'Notificación',
      canal: 'Ambos',
      asunto: 'Muestra {{codigoMuestra}} rechazada - decide Reenviar o Recoger',
      cuerpo:
        'Hola {{nombre}}, tu muestra {{codigoMuestra}} de la solicitud {{orden}} fue rechazada.\n\n' +
        'Motivo: {{motivo}}\nObservaciones: {{observaciones}}\nActa: {{actaPdf}}\n\n' +
        'Responde con Reenviar o Recoger desde la plataforma.',
    },
    {
      codigo: 'muestra-avance',
      nombre: 'Avance de muestra',
      tipo: 'Notificación',
      canal: 'Ambos',
      asunto: 'Muestra {{codigoMuestra}} - etapa {{estado}}',
      cuerpo:
        'Hola {{nombre}}, tu muestra {{codigoMuestra}} de la solicitud {{orden}} avanzó a la ' +
        'etapa "{{estado}}" (avance {{porcentajeAvance}}%).',
    },
    {
      codigo: 'analista-asignado',
      nombre: 'Asignación de analista',
      tipo: 'Notificación',
      canal: 'Ambos',
      asunto: 'Muestra asignada: {{codigoMuestra}}',
      cuerpo:
        '{{verbo}} la muestra {{codigoMuestra}} (prioridad {{prioridad}}, turno {{turno}}).\n' +
        'Etapa actual: {{estado}}\nMotivo: {{motivo}}',
    },
    {
      codigo: 'solicitud-cerrada',
      nombre: 'Solicitud cerrada',
      tipo: 'Resultados',
      canal: 'Ambos',
      asunto: 'Solicitud {{orden}} cerrada',
      cuerpo:
        'Hola {{nombre}}, tu solicitud {{orden}} quedó cerrada: el informe fue aprobado y tu ' +
        'encuesta quedó registrada.\n\nYa puedes descargar el informe desde la plataforma.',
    },
    {
      codigo: 'pqr-actualizada',
      nombre: 'PQR actualizada',
      tipo: 'Notificación',
      canal: 'Ambos',
      asunto: 'PQR {{tipo}} - estado {{estado}}',
      cuerpo:
        'Hola {{nombre}}, tu {{tipo}} cambió al estado "{{estado}}".\n\n{{respuesta}}\n\n' +
        'Consulta el detalle en la plataforma.',
    },
    {
      codigo: 'alerta-retraso-muestra',
      nombre: 'Alerta de retraso - muestra',
      tipo: 'Alerta de Retraso',
      canal: 'Correo',
      asunto: 'Alerta de retraso - muestra {{codigoMuestra}}',
      cuerpo:
        'La muestra {{codigoMuestra}} (solicitud {{orden}}) lleva más de {{dias}} días sin ' +
        'avance. Etapa actual: {{estado}}.',
    },
    {
      codigo: 'alerta-retraso-cupon',
      nombre: 'Alerta de retraso - cupón',
      tipo: 'Alerta de Retraso',
      canal: 'Correo',
      asunto: 'Alerta de retraso - cupón {{codigoReferencia}}',
      cuerpo:
        'El cupón {{codigoReferencia}} (solicitud {{orden}}) lleva más de {{dias}} días sin ' +
        'pago registrado.',
    },
    {
      codigo: 'verificacion-aprobada',
      nombre: 'Verificación SENA aprobada',
      tipo: 'Notificación',
      canal: 'Ambos',
      asunto: 'Verificación SENA aprobada',
      cuerpo:
        'Hola {{nombre}}, tu verificación como miembro SENA fue aprobada. Ya puedes solicitar ' +
        'análisis con la tarifa exonerada ($0) y prioridad A1.',
    },
    {
      codigo: 'verificacion-rechazada',
      nombre: 'Verificación SENA rechazada',
      tipo: 'Notificación',
      canal: 'Ambos',
      asunto: 'Verificación SENA rechazada',
      cuerpo:
        'Hola {{nombre}}, tu solicitud de verificación SENA fue rechazada. Revisa que tu correo ' +
        'institucional (@sena.edu.co) y tu soporte (carné o certificado) estén correctos y vuelve a intentarlo.',
    },
  ];
  for (const plantilla of plantillasDef) {
    await PlantillaMensaje.findOneAndUpdate(
      { codigo: plantilla.codigo },
      { $setOnInsert: plantilla },
      { upsert: true, new: true, runValidators: true }
    );
  }

  const parametrosDef = [
    { clave: 'diasAlertaRetraso', valor: '5', descripcion: 'Días sin avance para la alerta de retraso (RF-32)' },
    { clave: 'cronAlertaRetraso', valor: '0 7 * * *', descripcion: 'Expresión cron de las alertas de retraso (RF-32)' },
    { clave: 'notificacionMaxIntentos', valor: '3', descripcion: 'Reintentos de envío de correo (RF-14)' },
    {
      clave: 'correoProduccionCentros',
      valor: '',
      descripcion: 'Correo de producción de centros que recibe las alertas de retraso (RF-32)',
    },
  ];
  for (const parametro of parametrosDef) {
    await ParametroSistema.findOneAndUpdate(
      { clave: parametro.clave },
      { $setOnInsert: parametro },
      { upsert: true, new: true, runValidators: true }
    );
  }

  console.log('✅ Seed completado:');
  console.log(`   - Módulos: ${modulos.length}`);
  console.log(`   - Roles: ${Object.keys(roles).join(', ')}`);
  console.log(`   - Tipologías: ${nombresTipologias.length}`);
  console.log(`   - Plantillas de notificación: ${plantillasDef.length}`);
  console.log(`   - Parámetros del sistema: ${parametrosDef.length}`);
  console.log(`   - Admin: ${correo}`);
};

// ============================================================
// Arranque lineal: conectar -> sembrar (--seed) o escuchar.
// El await a nivel superior es válido en ES Modules (Node >= 14.8)
// y garantiza que el servidor NO anuncie que está corriendo sin BD.
// ============================================================
await conectarDB();

if (esModoSeed) {
  await correrSeed();
  await desconectarDB();
  process.exit(0);
}

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

// Cron de alertas de retraso (RF-32): se programa tras conectar a la BD.
await iniciarCron();

// Recupera correos pendientes que quedaron sin enviar en una ejecución anterior
// (la cola en memoria se pierde al reiniciar). Best-effort: no bloquea el arranque.
drenarCorreosPendientes().catch((err) =>
  console.error(`⚠️  Fallo drenando correos pendientes: ${err.message}`)
);
