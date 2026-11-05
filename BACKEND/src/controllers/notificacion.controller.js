import asyncHandler from '../utils/asyncHandler.js';
import crudFactory from '../utils/crudFactory.js';
import Notificacion from '../models/Notificacion.js';
import Usuario from '../models/Usuario.js';
import { encolarCorreo } from '../services/colaNotificaciones.service.js';

// Notificaciones enviadas a los usuarios
const notificaciones = {
  ...crudFactory(Notificacion, ['usuario', 'plantilla', 'solicitud']),

  // Envía un correo libre (texto escrito por el usuario) a un cliente.
  // Solo Administrador/Recepcionista. Crea la Notificacion "Pendiente" y la
  // encola con el mismo mecanismo de la cola (asíncrono con reintentos).
  enviarCorreo: asyncHandler(async (req, res) => {
    const { usuario, asunto, contenido } = req.body;

    const destinatario = await Usuario.findById(usuario).select('correo nombres apellidos');
    if (!destinatario) {
      return res.status(404).json({ ok: false, mensaje: 'Cliente no encontrado' });
    }

    const correo = await Notificacion.create({
      usuario: destinatario._id,
      plantilla: null,
      solicitud: null,
      canal: 'Correo',
      estado: 'Pendiente',
      intentos: 0,
      para: destinatario.correo,
      asunto,
      contenido,
    });

    encolarCorreo({
      notificacionId: String(correo._id),
      para: destinatario.correo,
      asunto,
      contenido,
    });

    res.status(201).json({ ok: true, data: correo });
  }),
};

export { notificaciones };
