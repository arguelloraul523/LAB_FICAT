import mongoose from 'mongoose';

// Plantilla de mensaje para notificaciones
const plantillaMensajeSchema = new mongoose.Schema(
  {
    modificadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
    // Identificador estable del evento (p.ej. "pago-aprobado"): el servicio
    // único lo usa para localizar la plantilla en CADA envío (RF-14).
    codigo: { type: String, required: true, unique: true, trim: true, lowercase: true },
    nombre: { type: String, required: true, trim: true },
    tipo: { type: String, enum: ['Notificación', 'Alerta de Retraso', 'Resultados'], required: true },
    canal: { type: String, enum: ['Correo', 'App', 'Ambos'], default: 'Ambos' },
    asunto: { type: String, required: true, trim: true },
    // Cuerpo con variables {{nombre}}, {{orden}}, {{estado}}, {{fecha}}, etc.
    cuerpo: { type: String, required: true },
    fechaModificacion: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('PlantillaMensaje', plantillaMensajeSchema);
