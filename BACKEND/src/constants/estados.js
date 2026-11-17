// ============================================================
// Estados y máquinas de estado del flujo (fuente única de verdad).
// RF: 18 (trazabilidad), 09 (pagos), 20 (rechazos), 22 (ceguera).
// Las transiciones inválidas se rechazan con 409 (ver transicion.middleware).
// ============================================================

// Estados válidos por entidad (deben coincidir con los enum de los modelos).
const ESTADOS = {
  solicitud: [
    'Pre-solicitud',
    'Cotizada',
    'No aceptada',
    'Pendiente de pago',
    'Pagada',
    'En proceso',
    'Finalizada',
    'Cancelada',
  ],
  cotizacion: ['Enviada', 'Aceptada', 'No aceptada'],
  pago: ['Pendiente de verificación', 'Pagado', 'Rechazado'],
  muestra: ['Recibida', 'Aceptada', 'En observación', 'Rechazada'],
  // "Recibida" se conserva solo para muestras anteriores a 2026-10-09;
  // hoy el estado inicial de recepción es "Aceptada" o "En observación" (RF-17).
  etapa: ['Recepción', 'Análisis', 'Observaciones', 'Resultados', 'Validación', 'Re-ensayo', 'Finalizada', 'Cancelada'],
  // Informe de resultados (RF-25): nace "En revisión" y el Jefe (Admin) lo aprueba.
  informe: ['En revisión', 'Aprobado'],
  // PQR / inconformidades (RF-31).
  inconformidad: ['Abierta', 'En revisión', 'Resuelta', 'Cerrada'],
};

// Transiciones permitidas: desde -> [hasta, ...]. Un estado sin salidas es terminal.
const TRANSICIONES = {
  solicitud: {
    'Pre-solicitud': ['Cotizada', 'No aceptada', 'Cancelada'],
    // "Pagada" solo la pone el servidor al aceptar una cotización EXONERADA ($0);
    // el camino normal de un externo es Cotizada -> Pendiente de pago -> Pagada.
    Cotizada: ['Pendiente de pago', 'Pagada', 'Cancelada'],
    'Pendiente de pago': ['Pagada', 'Cancelada'],
    Pagada: ['En proceso'],
    'En proceso': ['Finalizada'],
    Finalizada: [],
    'No aceptada': [],
    Cancelada: [],
  },
  cotizacion: {
    Enviada: ['Aceptada', 'No aceptada'],
    Aceptada: [],
    'No aceptada': [],
  },
  pago: {
    'Pendiente de verificación': ['Pagado', 'Rechazado'],
    Pagado: [],
    // Un pago rechazado puede reintentarse con un nuevo comprobante (RF-09).
    Rechazado: ['Pendiente de verificación'],
  },
  muestra: {
    Recibida: ['Aceptada', 'En observación', 'Rechazada'],
    // Una muestra aceptada que se degrada también se puede rechazar (RF-20).
    Aceptada: ['En observación', 'Rechazada'],
    'En observación': ['Aceptada', 'Rechazada'],
    Rechazada: [],
  },
  etapa: {
    Recepción: ['Análisis'],
    Análisis: ['Observaciones', 'Resultados'],
    Observaciones: ['Análisis', 'Resultados'],
    Resultados: ['Validación', 'Re-ensayo'],
    Validación: ['Finalizada', 'Re-ensayo'],
    'Re-ensayo': ['Resultados'],
    Finalizada: [],
    // "Cancelada" es terminal y SOLO la escribe el servidor al rechazar
    // una muestra (services/rechazos.service.js): el ciclo técnico se cancela.
    Cancelada: [],
  },
  informe: {
    'En revisión': ['Aprobado'],
    Aprobado: [],
  },
  inconformidad: {
    Abierta: ['En revisión'],
    'En revisión': ['Resuelta'],
    // Una PQR resuelta puede reabrirse si el usuario no queda conforme.
    Resuelta: ['Cerrada', 'En revisión'],
    Cerrada: [],
  },
};

// Devuelve true si `hasta` es una transición válida desde `desde` en la máquina dada.
const transicionValida = (maquina, desde, hasta) => {
  const mapa = TRANSICIONES[maquina];
  if (!mapa) return false;
  if (!Object.prototype.hasOwnProperty.call(mapa, desde)) return false;
  return mapa[desde].includes(hasta);
};

export { ESTADOS, TRANSICIONES, transicionValida };
