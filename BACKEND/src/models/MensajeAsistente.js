import mongoose from 'mongoose';

// Mensaje del historial del asistente IA (RF-11):
// el servidor guarda el turno del usuario y el de la IA para dar
// contexto en las siguientes preguntas ("historial reciente").
const mensajeAsistenteSchema = new mongoose.Schema(
  {
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    rol: { type: String, enum: ['usuario', 'asistente'], required: true },
    contenido: { type: String, required: true },
    opcion: { type: mongoose.Schema.Types.ObjectId, ref: 'OpcionAsistenteIA', default: null },
  },
  { timestamps: true }
);

export default mongoose.model('MensajeAsistente', mensajeAsistenteSchema);
