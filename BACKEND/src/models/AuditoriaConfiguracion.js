import mongoose from 'mongoose';

// Auditoría de cambios de configuración (RF-27/RF-31):
// quién cambió qué y con qué valores (antes/después).
const auditoriaConfiguracionSchema = new mongoose.Schema(
  {
    entidad: { type: String, required: true, trim: true },
    referencia: { type: mongoose.Schema.Types.ObjectId, default: null },
    accion: { type: String, enum: ['Crear', 'Actualizar', 'Eliminar'], required: true },
    antes: { type: mongoose.Schema.Types.Mixed, default: null },
    despues: { type: mongoose.Schema.Types.Mixed, default: null },
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
    fecha: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

auditoriaConfiguracionSchema.index({ entidad: 1, fecha: -1 });
auditoriaConfiguracionSchema.index({ referencia: 1 });

export default mongoose.model('AuditoriaConfiguracion', auditoriaConfiguracionSchema);
