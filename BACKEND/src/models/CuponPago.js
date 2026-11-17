import mongoose from 'mongoose';

// Cupón de pago asociado a una cotización
const cuponPagoSchema = new mongoose.Schema(
  {
    cotizacion: { type: mongoose.Schema.Types.ObjectId, ref: 'Cotizacion', required: true, unique: true },
    codigoReferencia: { type: String, required: true, unique: true, trim: true },
    fechaEmision: { type: Date, default: Date.now },
    fechaLimitePago: { type: Date, required: true },
    // Cuentas donde se puede pagar (antes CUPON_CUENTA, ahora embebido)
    cuentas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CuentaRecaudo' }],
    // Última alerta de retraso enviada por el cron (RF-32).
    ultimaAlertaRetraso: { type: Date, default: null },
  },
  { timestamps: true }
);

cuponPagoSchema.index({ fechaLimitePago: 1 });
cuponPagoSchema.index({ ultimaAlertaRetraso: 1 });

export default mongoose.model('CuponPago', cuponPagoSchema);
