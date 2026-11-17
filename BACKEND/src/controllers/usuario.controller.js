import asyncHandler from '../utils/asyncHandler.js';
import bcrypt from 'bcryptjs';
import crudFactory from '../utils/crudFactory.js';
import { esCorreoSena } from '../constants/sena.js';
import { sanitizarBody } from '../constants/camposPermitidos.js';
import { notificar } from '../services/notificaciones.service.js';
import Usuario from '../models/Usuario.js';
import VerificacionSena from '../models/VerificacionSena.js';

const populate = ['rol', 'tipologia'];

// ===== Usuarios =====
// Crear usuario encriptando la contraseña (regla #12: whitelist del body).
const crearUsuario = asyncHandler(async (req, res) => {
  const { contrasena, ...resto } = req.body;

  // El Administrador sí gestiona rol/roles/tipoUsuario/activo; el resto de
  // campos sensibles (contrasenaHash, tokenRecuperacion, etc.) se descartan.
  const datos = sanitizarBody(resto, { permitir: ['rol', 'roles', 'tipoUsuario', 'activo'] });
  const contrasenaHash = await bcrypt.hash(contrasena, 10);

  const usuarioCreado = await Usuario.create({ ...datos, contrasenaHash });
  const usuario = usuarioCreado.toObject();
  delete usuario.contrasenaHash;

  res.status(201).json({ ok: true, data: usuario });
});

// Actualizar usuario (si llega "contrasena" la encripta; nunca acepta
// contrasenaHash ni tokenRecuperacion desde el body - regla #12).
const actualizarUsuario = asyncHandler(async (req, res) => {
  const { contrasena, ...resto } = req.body;

  const datos = sanitizarBody(resto, { permitir: ['rol', 'roles', 'tipoUsuario', 'activo'] });
  if (contrasena) {
    datos.contrasenaHash = await bcrypt.hash(contrasena, 10);
  }

  const usuario = await Usuario.findByIdAndUpdate(req.params.id, datos, {
    new: true,
    runValidators: true,
  });
  if (!usuario) return res.status(404).json({ ok: false, mensaje: 'Registro no encontrado' });

  res.json({ ok: true, data: usuario });
});

const usuarioCrud = crudFactory(Usuario, populate);
const usuarios = {
  listar: usuarioCrud.listar,
  obtener: usuarioCrud.obtener,
  crear: crearUsuario,
  actualizar: actualizarUsuario,
  eliminar: usuarioCrud.eliminar,
};

// ===== Verificación SENA =====
const verificacionCrud = crudFactory(VerificacionSena, ['usuario']);

// Aprueba o rechaza una solicitud de verificación SENA.
// Regla: solo se APRUEBA si el correo institucional es @sena.edu.co (2026-10-09);
// rechazar siempre está permitido (cubre documentos antiguos o mal creados).
// Se comprueba ANTES de escribir y luego se actualiza sin re-validar el documento
// completo, para que un correo heredado no impida ni aprobar (ya bloqueado) ni rechazar.
const verificar = (estado) =>
  asyncHandler(async (req, res) => {
    const doc = await VerificacionSena.findById(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, mensaje: 'Registro no encontrado' });

    if (estado === 'Aprobada' && !esCorreoSena(doc.correoInstitucional)) {
      return res.status(400).json({
        ok: false,
        mensaje: `El correo institucional debe terminar en @sena.edu.co (recibido: ${doc.correoInstitucional})`,
      });
    }

    const data = await VerificacionSena.findByIdAndUpdate(
      req.params.id,
      { estado, revisadoPor: req.usuario._id, fechaRevision: new Date() },
      { new: true }
    );

    // RF-02: notificar al usuario el resultado de su verificación SENA.
    // Un fallo al notificar nunca rompe la respuesta de la aprobación/rechazo.
    try {
      const usuario = await Usuario.findById(doc.usuario).select('nombres correo');
      if (usuario) {
        await notificar({
          codigo: estado === 'Aprobada' ? 'verificacion-aprobada' : 'verificacion-rechazada',
          usuario,
          solicitud: null,
          variables: { estado },
        });
      }
    } catch (err) {
      console.error(`⚠️  No se pudo notificar la verificación SENA: ${err.message}`);
    }

    res.json({ ok: true, data });
  });

const verificaciones = {
  listar: verificacionCrud.listar,
  obtener: verificacionCrud.obtener,
  crear: verificacionCrud.crear,
  eliminar: verificacionCrud.eliminar,
  aprobar: verificar('Aprobada'),
  rechazar: verificar('Rechazada'),
};

export { usuarios, verificaciones };
