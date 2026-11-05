import mongoose from 'mongoose';

// Examen asignado a la muestra (antes MUESTRA_EXAMEN, ahora embebido)
const muestraExamenSchema = new mongoose.Schema(
  {
    examen: { type: mongoose.Schema.Types.ObjectId, ref: 'Examen', required: true },
    resultado: { type: String, default: null },
    fechaResultado: { type: Date, default: null },
  },
  { _id: false }
);

// Muestra física recibida en el laboratorio
const muestraSchema = new mongoose.Schema(
  {
    solicitud: { type: mongoose.Schema.Types.ObjectId, ref: 'Solicitud', required: true },
    recepcionista: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    analista: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
    entregadoPor: { type: String, required: true, trim: true },
    fechaHoraEntrega: { type: Date, required: true },
    cantidadRecibida: { type: Number, required: true, min: 0 },
    unidadMedida: { type: String, required: true, trim: true },
    estadoEmpaque: { type: String, enum: ['Buen estado', 'Malas condiciones'], required: true },
    temperaturaRecepcion: { type: Number, default: null },
    codigoMuestra: { type: String, unique: true, sparse: true, trim: true },
    prioridad: { type: String, enum: ['A1', 'A2'], default: null },
    // Número de turno del día: lo asigna el servidor en recepción (RF-19).
    numeroTurno: { type: Number, default: null },
    // Estado inicial de recepción: "Aceptada" (default) o "En observación" (RF-17).
    // "Recibida" queda solo como valor histórico de muestras antiguas.
    estado: { type: String, enum: ['Recibida', 'Aceptada', 'En observación', 'Rechazada'], default: 'Aceptada' },
    etapaActual: {
      type: String,
      enum: ['Recepción', 'Análisis', 'Observaciones', 'Resultados', 'Validación', 'Re-ensayo', 'Finalizada', 'Cancelada'],
      default: 'Recepción',
    },
    observaciones: { type: String },
    // Datos del formulario "Recepción de muestras" (CAT-ST-MI-F-002).
    municipioRecoleccion: { type: String, trim: true, default: null },
    direccionTomaMuestra: { type: String, trim: true, default: null },
    lugarTomaMuestra: { type: String, trim: true, default: null },
    recolectadaPor: { type: String, trim: true, default: null },
    procedimientoMuestreo: { type: String, trim: true, default: null },
    matrizMuestra: { type: String, trim: true, default: null },
    fechaHoraRecoleccion: { type: Date, default: null },
    cotizacion: { type: mongoose.Schema.Types.ObjectId, ref: 'Cotizacion', default: null },
    itemCotizacion: { type: String, trim: true, default: null },
    fechaIngreso: { type: Date, default: Date.now },
    examenes: [muestraExamenSchema],
    // Última alerta de retraso enviada por el cron (RF-32): evita repetir
    // mientras la muestra no registre un nuevo avance (updatedAt).
    ultimaAlertaRetraso: { type: Date, default: null },
  },
  { timestamps: true }
);

// ===== Porcentaje de avance (Fase 6) =====
// Calculado de la etapa actual; nunca se guarda ni se acepta del body.
const AVANCE_POR_ETAPA = {
  Recepción: 10,
  Análisis: 40,
  Observaciones: 55,
  Resultados: 75,
  Validación: 90,
  'Re-ensayo': 70,
  Finalizada: 100,
  Cancelada: null,
};

muestraSchema.virtual('porcentajeAvance').get(function () {
  return AVANCE_POR_ETAPA[this.etapaActual] ?? null;
});

// El virtual viaja en las respuestas JSON/toObject.
muestraSchema.set('toJSON', { virtuals: true });
muestraSchema.set('toObject', { virtuals: true });

// Índices de consulta frecuente (dashboard, cron, cola, propiedad).
muestraSchema.index({ solicitud: 1 });
muestraSchema.index({ etapaActual: 1 });
muestraSchema.index({ prioridad: 1, numeroTurno: 1 });
muestraSchema.index({ updatedAt: 1 });

export default mongoose.model('Muestra', muestraSchema);
export { AVANCE_POR_ETAPA };
