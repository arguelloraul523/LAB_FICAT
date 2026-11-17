import Contador from '../models/Contador.js';

// ============================================================
// Números de turno de recepción (RF-19, RNF-08).
//
// La cola del laboratorio atiende A1 antes que A2 y, dentro de la
// misma prioridad, por orden de llegada (número de turno).
// El turno es una secuencia DIARIA atómica sobre la colección Contador
// ($inc + upsert), igual que los códigos: dos recepciones concurrentes
// nunca reciben el mismo turno.
//
// Ejemplo de clave: "TURNO-2026-10-09".
// ============================================================

// Clave de la serie diaria de turnos.
const claveDeFecha = (fecha = new Date()) => {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `TURNO-${anio}-${mes}-${dia}`;
};

// Reserva el siguiente turno del día (1, 2, 3, ...) de forma atómica.
const siguienteTurno = async (fecha = new Date()) => {
  const doc = await Contador.findOneAndUpdate(
    { _id: claveDeFecha(fecha) },
    { $inc: { secuencia: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return doc.secuencia;
};

// Orden de la cola: A1 antes que A2 y luego por llegada (turno asc).
// Es el MISMO criterio que el sort de Mongo de colaAtencion; se aplica
// además en memoria para garantizar el criterio (y poder probarlo sin BD).
const ordenarCola = (muestras = []) =>
  [...muestras].sort((a, b) => {
    const porPrioridad = String(a.prioridad || 'ZZ').localeCompare(String(b.prioridad || 'ZZ'));
    if (porPrioridad !== 0) return porPrioridad;
    return (a.numeroTurno || 0) - (b.numeroTurno || 0);
  });

export { claveDeFecha, siguienteTurno, ordenarCola };
