import mongoose from 'mongoose';

// Notificación enviada a un usuario
const notificacionSchema = new mongoose.Schema(
  {
    // `usuario` es null para correos sin cuenta (p. ej. correo de producción
    // de centros RF-32); en ese caso `para` guarda el destinatario.
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
    plantilla: { type: mongoose.Schema.Types.ObjectId, ref: 'PlantillaMensaje', default: null },
    solicitud: { type: mongoose.Schema.Types.ObjectId, ref: 'Solicitud', default: null },
    canal: { type: String, enum: ['Correo', 'App'], required: true },
    // Destinatario del correo (para poder drenar pendientes tras un reinicio).
    para: { type: String, default: null, trim: true },
    asunto: { type: String, required: true, trim: true },
    contenido: { type: String, required: true },
    fechaEnvio: { type: Date, default: Date.now },
    leida: { type: Boolean, default: false },
    // Resultado del envío (RF-14/RNF-09): estado, reintentos y último error.
    estado: { type: String, enum: ['Pendiente', 'Enviado', 'Fallido'], default: 'Pendiente' },
    intentos: { type: Number, default: 0, min: 0 },
    error: { type: String, default: null },
  },
  { timestamps: true }
);

notificacionSchema.index({ usuario: 1, leida: 1, fechaEnvio: -1 });
notificacionSchema.index({ estado: 1 });
notificacionSchema.index({ canal: 1, estado: 1, createdAt: 1 });

export default mongoose.model('Notificacion', notificacionSchema);
