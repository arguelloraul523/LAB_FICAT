import { body, query } from 'express-validator';
import { ESTADOS } from '../constants/estados.js';

// ============================================================
// Validaciones de recepción de muestras (RF-09, RF-17, RF-19).
// - Búsqueda por código de pre-solicitud para la recepción.
// - Creación: datos de entrega obligatorios; el estado inicial solo
//   puede ser "Aceptada" o "En observación" (RF-17).
// La temperatura obligatoria si el examen la exige se valida en el
// servicio (muestras.service), porque depende de la cotización.
// El estado definitivo, el código y el turno los fija el servidor.
//
// Fase 6:
// - Cambio de etapa (RF-23): etapa destino válida; la justificación
//   para Re-ensayo se exige en el servicio (la máquina decide).
// - Asignación / reapertura (RF-28): motivo obligatorio.
// - Des-anonimización (RF-29): contraseña + motivo obligatorios.
// ============================================================

const ESTADOS_INICIALES = ['Aceptada', 'En observación'];

// Búsqueda para recepción: GET /api/muestras/buscar?codigo=PRE-...
const validarBuscarMuestra = [
  query('codigo')
    .trim()
    .notEmpty()
    .withMessage('El parámetro ?codigo= (código de pre-solicitud) es obligatorio'),
];

// Recepción de la muestra: POST /api/muestras
const validarCrearMuestra = [
  body('solicitud').isMongoId().withMessage('La solicitud es obligatoria y debe ser un id válido'),
  body('entregadoPor')
    .trim()
    .notEmpty()
    .withMessage('El nombre de quien entrega la muestra es obligatorio'),
  body('fechaHoraEntrega')
    .isISO8601()
    .withMessage('La fecha y hora de entrega deben ser válidas (ISO 8601)'),
  body('cantidadRecibida')
    .isFloat({ min: 0 })
    .withMessage('La cantidad recibida debe ser un número mayor o igual a 0')
    .bail()
    .toFloat(),
  body('unidadMedida').trim().notEmpty().withMessage('La unidad de medida es obligatoria'),
  body('estadoEmpaque')
    .isIn(['Buen estado', 'Malas condiciones'])
    .withMessage('El estado del empaque debe ser "Buen estado" o "Malas condiciones"'),
  body('estadoInicial')
    .optional()
    .isIn(ESTADOS_INICIALES)
    .withMessage('El estado inicial debe ser "Aceptada" o "En observación"'),
  body('temperaturaRecepcion')
    .optional({ nullable: true })
    .isFloat()
    .withMessage('La temperatura de recepción debe ser un número'),
  // Datos del formulario "Recepción de muestras" (CAT-ST-MI-F-002).
  body('municipioRecoleccion').optional({ nullable: true }).trim().isString(),
  body('departamento').optional({ nullable: true }).trim().isString(),
  body('direccionTomaMuestra').optional({ nullable: true }).trim().isString(),
  body('lugarTomaMuestra').optional({ nullable: true }).trim().isString(),
  body('recolectadaPor').optional({ nullable: true }).trim().isString(),
  body('procedimientoMuestreo').optional({ nullable: true }).trim().isString(),
  body('matrizMuestra').optional({ nullable: true }).trim().isString(),
  body('fechaHoraRecoleccion')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('La fecha y hora de recolección deben ser válidas (ISO 8601)'),
  body('cotizacion').optional({ nullable: true }).isMongoId().withMessage('La cotización debe ser un id válido'),
  body('itemCotizacion').optional({ nullable: true }).trim().isString(),
];

// Cambio de etapa: PUT /api/muestras/:id/cambiar-etapa (RF-23)
const validarCambiarEtapa = [
  body('etapaActual')
    .isIn(ESTADOS.etapa)
    .withMessage('La etapa de destino no es válida'),
  body('justificacion')
    .optional({ nullable: true })
    .isString()
    .withMessage('La justificación debe ser texto'),
];

// Asignación / reasignación de analista: PUT /api/muestras/:id/asignar (RF-28)
const validarAsignar = [
  body('analista').isMongoId().withMessage('El analista es obligatorio y debe ser un id válido'),
  body('accion')
    .isIn(['Asignar', 'Reasignar'])
    .withMessage('La acción debe ser "Asignar" o "Reasignar"'),
  body('motivo')
    .trim()
    .notEmpty()
    .withMessage('El motivo es obligatorio (RF-28)'),
];

// Reapertura: PUT /api/muestras/:id/reabrir (RF-28)
const validarReabrir = [
  body('motivo')
    .trim()
    .notEmpty()
    .withMessage('El motivo es obligatorio (RF-28)'),
  body('etapaDestino')
    .optional()
    .isIn(['Resultados', 'Validación', 'Re-ensayo'])
    .withMessage('La etapa destino (etapaDestino) debe ser Resultados, Validación o Re-ensayo'),
];

// Des-anonimización: PUT /api/muestras/:id/datos-cliente (RF-29)
const validarDatosCliente = [
  body('contrasena')
    .notEmpty()
    .withMessage('La contraseña es obligatoria (RF-29)'),
  body('motivo')
    .trim()
    .notEmpty()
    .withMessage('El motivo es obligatorio (RF-29)'),
];

export {
  ESTADOS_INICIALES,
  validarBuscarMuestra,
  validarCrearMuestra,
  validarCambiarEtapa,
  validarAsignar,
  validarReabrir,
  validarDatosCliente,
};
