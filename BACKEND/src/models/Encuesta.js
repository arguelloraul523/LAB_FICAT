import mongoose from 'mongoose';

// Respuesta de la encuesta (antes RESPUESTA_ENCUESTA, ahora embebido)
const respuestaEncuestaSchema = new mongoose.Schema(
  {
    pregunta: { type: mongoose.Schema.Types.ObjectId, ref: 'PreguntaEncuesta', required: true },
    // Escala de satisfacción 1 a 5 (RF-26).
    calificacion: { type: Number, required: true, min: 1, max: 5 },
  },
  { _id: false }
);

// Encuesta de satisfacción asociada a una solicitud
const encuestaSchema = new mongoose.Schema(
  {
    solicitud: { type: mongoose.Schema.Types.ObjectId, ref: 'Solicitud', required: true, unique: true },
    comentario: { type: String },
    fechaRespuesta: { type: Date, default: Date.now },
    respuestas: [respuestaEncuestaSchema],
    // true solo cuando el servicio validó que TODAS las preguntas activas
    // quedaron respondidas en escala 1-5 (bloquea la descarga del informe, RF-26).
    completa: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Encuesta', encuestaSchema);
