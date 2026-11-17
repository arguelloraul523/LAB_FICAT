// ============================================================
// Código ciego del Analista (RF-22, RNF-01).
//
// El Analista NUNCA recibe datos de identidad del cliente. Su respuesta
// es un DTO técnico con solo: código, parámetros y estado.
// Jamás se incluyen: solicitud, usuario, entregadoPor ni observaciones
// (pueden contener nombres o referencias al cliente), y en sus
// respuestas nunca se popula "solicitud".
//
// Criterio de aceptación: ninguna respuesta del rol Analista contiene
// nombre, correo ni documento del cliente.
// ============================================================

// Campos del catálogo que el Analista sí ve (parámetros técnicos del examen).
const PARAMETROS_EXAMEN =
  'nombre cantidadRequerida unidadMedida tipoEnvase temperaturaConservacion tiempoMaxTrasladoHoras';

// DTO técnico: limpia un documento de muestra para el Analista.
const dtoTecnico = (muestra) => {
  if (!muestra) return null;
  const doc = typeof muestra.toObject === 'function' ? muestra.toObject() : { ...muestra };

  return {
    _id: doc._id,
    codigoMuestra: doc.codigoMuestra || null,
    prioridad: doc.prioridad || null,
    numeroTurno: doc.numeroTurno ?? null,
    estado: doc.estado,
    etapaActual: doc.etapaActual,
    porcentajeAvance: doc.porcentajeAvance ?? null,
    temperaturaRecepcion: doc.temperaturaRecepcion ?? null,
    cantidadRecibida: doc.cantidadRecibida,
    unidadMedida: doc.unidadMedida,
    estadoEmpaque: doc.estadoEmpaque,
    fechaIngreso: doc.fechaIngreso,
    // Solo parámetros del catálogo + resultado técnico.
    examenes: (doc.examenes || []).map((item) => {
      const examen = item.examen && typeof item.examen === 'object' ? item.examen : null;
      return {
        examen: examen
          ? {
              _id: examen._id,
              nombre: examen.nombre,
              cantidadRequerida: examen.cantidadRequerida,
              unidadMedida: examen.unidadMedida,
              tipoEnvase: examen.tipoEnvase,
              temperaturaConservacion: examen.temperaturaConservacion,
              tiempoMaxTrasladoHoras: examen.tiempoMaxTrasladoHoras,
            }
          : item.examen,
        resultado: item.resultado ?? null,
        fechaResultado: item.fechaResultado ?? null,
      };
    }),
  };
};

export { dtoTecnico, PARAMETROS_EXAMEN };
