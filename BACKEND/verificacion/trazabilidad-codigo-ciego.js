// ============================================================
// Verificación de trazabilidad, código ciego y auditoría (RF-22…RF-29).
// SIN conectar a MongoDB.
// Uso:  node verificacion/trazabilidad-codigo-ciego.js   (sale con código 1 si algo falla)
// No forma parte de la aplicación; replica las reglas con dobles en
// memoria. Los casos HTTP están en API_TEST.http (54-59).
// Criterios del usuario:
//   - ninguna respuesta del rol Analista contiene nombre, correo ni
//     documento del cliente,
//   - Re-ensayo exige justificación,
//   - reasignar/reabrir exige motivo,
//   - des-anonimizar exige contraseña + motivo y queda auditado.
// ============================================================
import { validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import {
  validarCambiarEtapa,
  validarAsignar,
  validarReabrir,
  validarDatosCliente,
} from '../src/validators/muestra.validators.js';
import { dtoTecnico } from '../src/services/blindaje.service.js';
import {
  cambiarEtapaMuestra,
  asignarAnalista,
  reabrirMuestra,
  datosCliente,
} from '../src/services/muestras.service.js';
import { htmlHojaTrabajo } from '../src/services/rotulo.service.js';
import Muestra, { AVANCE_POR_ETAPA } from '../src/models/Muestra.js';
import HistorialMuestra from '../src/models/HistorialMuestra.js';
import Notificacion from '../src/models/Notificacion.js';
import Usuario from '../src/models/Usuario.js';

let total = 0;
let fallos = 0;
const ok = (c, m) => {
  total++;
  if (c) console.log('ok: ' + m);
  else {
    fallos++;
    console.log('FALLO: ' + m);
  }
};
const correr = async (cadena, body, query = {}) => {
  const req = { body, query };
  for (const c of cadena) await c.run(req);
  return validationResult(req);
};

(async () => {
  // ---- Dobles de BD (nada toca MongoDB) ----
  const historialCreado = [];
  const notificaciones = [];
  HistorialMuestra.create = async (d) => {
    historialCreado.push(d);
    return d;
  };
  Notificacion.create = async (d) => {
    notificaciones.push(d);
    return d;
  };
  const reiniciar = () => {
    historialCreado.length = 0;
    notificaciones.length = 0;
  };

  // Usuario.findById devuelve un "thenable" encadenable (.select/.populate).
  let usuarioActual = null;
  Usuario.findById = () => {
    const chain = {
      select: () => chain,
      populate: () => chain,
      then: (resolve, reject) => Promise.resolve(usuarioActual).then(resolve, reject),
    };
    return chain;
  };

  // Muestra.findById devuelve un thenable con .populate encadenable.
  let muestraActual = null;
  const muestraChain = () => {
    const chain = {
      populate: () => chain,
      then: (resolve, reject) => Promise.resolve(muestraActual).then(resolve, reject),
    };
    return chain;
  };
  Muestra.findById = () => muestraChain();

  const fakeMuestra = (etapa, extra = {}) => {
    const m = {
      _id: 'm1',
      codigoMuestra: 'A1-2026-0001',
      prioridad: 'A1',
      numeroTurno: 3,
      estado: 'Aceptada',
      etapaActual: etapa,
      analista: null,
      temperaturaRecepcion: 4,
      cantidadRecibida: 100,
      unidadMedida: 'mL',
      estadoEmpaque: 'Buen estado',
      fechaIngreso: new Date(2026, 9, 9),
      observaciones: 'Dato del cliente que no debe salir',
      entregadoPor: 'Ana Gomez',
      solicitud: { usuario: 'u1', codigoPresolicitud: 'PRE-2026-0001' },
      ...extra,
    };
    Object.defineProperty(m, 'porcentajeAvance', {
      get() {
        return AVANCE_POR_ETAPA[this.etapaActual] ?? null;
      },
    });
    m.save = async () => m;
    m.populate = async () => m;
    return m;
  };

  const HASH = await bcrypt.hash('Secreto123', 10);
  const analistaOk = {
    _id: 'a1',
    correo: 'analista@x.com',
    nombres: 'Luis',
    apellidos: 'Perez',
    activo: true,
    rol: { nombre: 'Analista' },
    roles: [],
  };
  const recepcionista = {
    _id: 'u9',
    correo: 'recepcion@x.com',
    nombres: 'Recep',
    apellidos: 'X',
    activo: true,
    rol: { nombre: 'Recepcionista' },
    roles: [],
    contrasenaHash: HASH,
  };

  // ---- 1) Porcentaje de avance (5) ----
  const base = {
    solicitud: '507f1f77bcf86cd799439011',
    recepcionista: '507f1f77bcf86cd799439012',
    entregadoPor: 'Carlos',
    fechaHoraEntrega: new Date(),
    cantidadRecibida: 100,
    unidadMedida: 'mL',
    estadoEmpaque: 'Buen estado',
  };
  const docMuestra = new Muestra(base);
  docMuestra.etapaActual = 'Recepción';
  ok(docMuestra.porcentajeAvance === 10, 'avance: Recepción 10%');
  docMuestra.etapaActual = 'Análisis';
  ok(docMuestra.porcentajeAvance === 40, 'avance: Análisis 40%');
  docMuestra.etapaActual = 'Re-ensayo';
  ok(docMuestra.porcentajeAvance === 70, 'avance: Re-ensayo 70% (retrocede)');
  docMuestra.etapaActual = 'Finalizada';
  ok(docMuestra.porcentajeAvance === 100, 'avance: Finalizada 100%');
  docMuestra.etapaActual = 'Cancelada';
  const jsonMuestra = docMuestra.toJSON();
  ok(jsonMuestra.porcentajeAvance === null && 'porcentajeAvance' in jsonMuestra, 'avance: Cancelada null y viaja en toJSON');

  // ---- 2) Código ciego: dtoTecnico (4) ----
  const dto = dtoTecnico({
    _id: 'm1',
    codigoMuestra: 'A1-2026-0001',
    prioridad: 'A1',
    numeroTurno: 1,
    estado: 'Aceptada',
    etapaActual: 'Análisis',
    porcentajeAvance: 40,
    temperaturaRecepcion: 4,
    cantidadRecibida: 100,
    unidadMedida: 'mL',
    estadoEmpaque: 'Buen estado',
    fechaIngreso: new Date(),
    entregadoPor: 'Ana Gomez',
    observaciones: 'Ana trajo la muestra',
    solicitud: {
      codigoPresolicitud: 'PRE-1',
      usuario: { nombres: 'Ana', correo: 'ana@x.com', numeroDocumento: '123' },
    },
    examenes: [
      {
        examen: {
          _id: 'e1',
          nombre: 'Glucosa',
          cantidadRequerida: 2,
          unidadMedida: 'mL',
          tipoEnvase: 'Tubo',
          temperaturaConservacion: 'Refrigerado',
          tiempoMaxTrasladoHoras: 4,
        },
        resultado: null,
      },
    ],
  });
  const jsonDto = JSON.stringify(dto);
  ok(
    !('solicitud' in dto) && !('usuario' in dto) && !('entregadoPor' in dto) && !('observaciones' in dto),
    'dtoTecnico: no expone solicitud/usuario/entregadoPor/observaciones'
  );
  ok(!jsonDto.includes('Ana') && !jsonDto.includes('ana@x.com') && !jsonDto.includes('123'), 'dtoTecnico: SIN nombre, correo ni documento (criterio RF-22)');
  ok(
    dto.codigoMuestra === 'A1-2026-0001' && dto.porcentajeAvance === 40 && dto.examenes[0].examen.nombre === 'Glucosa',
    'dtoTecnico: conserva código, parámetros y avance'
  );
  ok(dto.examenes[0].examen.tipoEnvase === 'Tubo' && dto.examenes[0].resultado === null, 'dtoTecnico: conserva parámetros técnicos y resultado');

  // ---- 3) Hoja de trabajo anónima (3) ----
  const html = htmlHojaTrabajo({
    muestra: {
      codigoMuestra: 'A1-2026-0007',
      prioridad: 'A1',
      numeroTurno: 3,
      etapaActual: 'Análisis',
      estado: 'Aceptada',
      cantidadRecibida: 200,
      unidadMedida: 'mL',
      estadoEmpaque: 'Buen estado',
      temperaturaRecepcion: 4,
      entregadoPor: 'Ana Gomez',
      observaciones: 'Ana trajo la muestra',
      examenes: [
        {
          examen: {
            nombre: 'Glucosa',
            cantidadRequerida: 2,
            unidadMedida: 'mL',
            tipoEnvase: 'Tubo',
            temperaturaConservacion: 'Refrigerado',
            tiempoMaxTrasladoHoras: 4,
          },
          resultado: null,
        },
      ],
      analista: { nombres: 'Luis', apellidos: 'Perez' },
    },
  });
  ok(html.includes('A1-2026-0007') && html.includes('Glucosa'), 'hoja de trabajo: código y parámetros');
  ok(!html.includes('Ana Gomez') && !html.includes('Ana trajo'), 'hoja de trabajo: SIN datos del cliente (RF-22)');
  ok(html.includes('Analista') && html.includes('Resultado'), 'hoja de trabajo: casillas de resultado y firma');
  const htmlInyeccion = htmlHojaTrabajo({ muestra: { codigoMuestra: '<script>x</script>' } });
  ok(!htmlInyeccion.includes('<script>x</script>'), 'hoja de trabajo: HTML escapado (sin inyección)');

  // ---- 4) Cambio de etapa + hitos (6) ----
  // El dueño de la solicitud (para las notificaciones al cliente).
  usuarioActual = analistaOk;
  reiniciar();
  muestraActual = fakeMuestra('Recepción');
  try {
    await cambiarEtapaMuestra({ id: 'm1', etapaActual: 'Resultados', usuario: { _id: 'u1' } });
    ok(false, 'cambiar etapa: transición inválida -> 409');
  } catch (e) {
    ok(e.statusCode === 409, 'cambiar etapa: transición inválida -> 409');
  }

  muestraActual = fakeMuestra('Resultados');
  try {
    await cambiarEtapaMuestra({ id: 'm1', etapaActual: 'Re-ensayo', justificacion: '   ', usuario: { _id: 'u1' } });
    ok(false, 'cambiar etapa: Re-ensayo sin justificación -> 400 (RF-23)');
  } catch (e) {
    ok(e.statusCode === 400, 'cambiar etapa: Re-ensayo sin justificación -> 400 (RF-23)');
  }

  reiniciar();
  muestraActual = fakeMuestra('Resultados');
  const enReensayo = await cambiarEtapaMuestra({
    id: 'm1',
    etapaActual: 'Re-ensayo',
    justificacion: 'Resultado dudoso',
    usuario: { _id: 'u1' },
  });
  ok(enReensayo.etapaActual === 'Re-ensayo', 'cambiar etapa: Re-ensayo con justificación pasa');
  ok(
    historialCreado.some((h) => h.accion === 'Cambio de etapa' && h.comentario === 'Resultado dudoso'),
    'cambiar etapa: historial guarda la justificación'
  );
  ok(notificaciones.length === 1, 'cambiar etapa: hito Re-ensayo notifica al cliente');

  reiniciar();
  muestraActual = fakeMuestra('Análisis');
  await cambiarEtapaMuestra({ id: 'm1', etapaActual: 'Observaciones', usuario: { _id: 'u1' } });
  ok(notificaciones.length === 0, 'cambiar etapa: Observaciones no notifica (no es hito)');

  reiniciar();
  muestraActual = fakeMuestra('Validación');
  await cambiarEtapaMuestra({ id: 'm1', etapaActual: 'Finalizada', usuario: { _id: 'u1' } });
  ok(notificaciones.length === 1, 'cambiar etapa: hito Finalizada notifica');

  // ---- 5) Asignación / reasignación (6) ----
  reiniciar();
  usuarioActual = analistaOk;
  muestraActual = fakeMuestra('Análisis');
  try {
    await asignarAnalista({ id: 'm1', analistaId: 'a1', accion: 'Asignar', motivo: '', usuario: { _id: 'u1' } });
    ok(false, 'asignar: sin motivo -> 400 (RF-28)');
  } catch (e) {
    ok(e.statusCode === 400, 'asignar: sin motivo -> 400 (RF-28)');
  }

  usuarioActual = { ...analistaOk, rol: { nombre: 'Cliente' }, roles: [] };
  try {
    await asignarAnalista({ id: 'm1', analistaId: 'a1', accion: 'Asignar', motivo: 'carga', usuario: { _id: 'u1' } });
    ok(false, 'asignar: usuario sin rol Analista -> 400');
  } catch (e) {
    ok(e.statusCode === 400, 'asignar: usuario sin rol Analista -> 400');
  }

  usuarioActual = analistaOk;
  muestraActual = fakeMuestra('Análisis', { analista: 'a0' });
  try {
    await asignarAnalista({ id: 'm1', analistaId: 'a2', accion: 'Asignar', motivo: 'x', usuario: { _id: 'u1' } });
    ok(false, 'asignar: ya tiene analista -> 409 (use Reasignar)');
  } catch (e) {
    ok(e.statusCode === 409, 'asignar: ya tiene analista -> 409 (use Reasignar)');
  }

  muestraActual = fakeMuestra('Análisis');
  try {
    await asignarAnalista({ id: 'm1', analistaId: 'a2', accion: 'Reasignar', motivo: 'x', usuario: { _id: 'u1' } });
    ok(false, 'reasignar: sin analista previo -> 409 (use Asignar)');
  } catch (e) {
    ok(e.statusCode === 409, 'reasignar: sin analista previo -> 409 (use Asignar)');
  }

  reiniciar();
  muestraActual = fakeMuestra('Análisis');
  const asignada = await asignarAnalista({
    id: 'm1',
    analistaId: 'a1',
    accion: 'Asignar',
    motivo: 'carga de trabajo',
    usuario: { _id: 'u1' },
  });
  ok(String(asignada.analista) === 'a1', 'asignar: guarda el analista en la muestra');
  ok(
    historialCreado.some((h) => h.accion === 'Asignación' && h.comentario === 'carga de trabajo'),
    'asignar: historial Asignación con motivo'
  );
  ok(notificaciones.length === 1, 'asignar: notifica al analista asignado');

  reiniciar();
  muestraActual = fakeMuestra('Análisis', { analista: 'a0' });
  await asignarAnalista({ id: 'm1', analistaId: 'a1', accion: 'Reasignar', motivo: 'vacaciones', usuario: { _id: 'u1' } });
  ok(historialCreado.some((h) => h.accion === 'Reasignación'), 'reasignar: historial Reasignación');

  // ---- 6) Reapertura (5) ----
  reiniciar();
  muestraActual = fakeMuestra('Análisis');
  try {
    await reabrirMuestra({ id: 'm1', motivo: 'x', usuario: { _id: 'u1' } });
    ok(false, 'reabrir: solo desde Finalizada -> 409');
  } catch (e) {
    ok(e.statusCode === 409, 'reabrir: solo desde Finalizada -> 409');
  }

  muestraActual = fakeMuestra('Finalizada');
  try {
    await reabrirMuestra({ id: 'm1', motivo: '', usuario: { _id: 'u1' } });
    ok(false, 'reabrir: sin motivo -> 400 (RF-28)');
  } catch (e) {
    ok(e.statusCode === 400, 'reabrir: sin motivo -> 400 (RF-28)');
  }

  reiniciar();
  muestraActual = fakeMuestra('Finalizada');
  const reabierta = await reabrirMuestra({ id: 'm1', motivo: 'corrección', usuario: { _id: 'u1' } });
  ok(reabierta.etapaActual === 'Validación', 'reabrir: destino por defecto Validación');
  ok(
    historialCreado.some((h) => h.accion === 'Reapertura' && h.comentario === 'corrección'),
    'reabrir: historial Reapertura con motivo'
  );

  reiniciar();
  muestraActual = fakeMuestra('Finalizada');
  const reabierta2 = await reabrirMuestra({ id: 'm1', etapaDestino: 'Resultados', motivo: 'error analítico', usuario: { _id: 'u1' } });
  ok(reabierta2.etapaActual === 'Resultados', 'reabrir: respeta etapaDestino Resultados');

  reiniciar();
  muestraActual = fakeMuestra('Finalizada');
  const reabierta3 = await reabrirMuestra({ id: 'm1', etapaDestino: 'Inventada', motivo: 'x', usuario: { _id: 'u1' } });
  ok(reabierta3.etapaActual === 'Validación', 'reabrir: destino inválido cae a Validación');

  // ---- 7) Des-anonimización (6) ----
  reiniciar();
  usuarioActual = recepcionista;
  muestraActual = fakeMuestra('Análisis');
  try {
    await datosCliente({ id: 'm1', contrasena: 'x', motivo: '', usuario: { _id: 'u9' } });
    ok(false, 'datos-cliente: sin motivo -> 400 (RF-29)');
  } catch (e) {
    ok(e.statusCode === 400, 'datos-cliente: sin motivo -> 400 (RF-29)');
  }

  try {
    await datosCliente({ id: 'm1', contrasena: '', motivo: 'contactar', usuario: { _id: 'u9' } });
    ok(false, 'datos-cliente: sin contraseña -> 400');
  } catch (e) {
    ok(e.statusCode === 400, 'datos-cliente: sin contraseña -> 400');
  }

  muestraActual = fakeMuestra('Análisis', {
    solicitud: {
      codigoPresolicitud: 'PRE-2026-0001',
      usuario: {
        _id: 'u1',
        nombres: 'Ana',
        apellidos: 'Gomez',
        correo: 'ana@x.com',
        tipoDocumento: 'CC',
        numeroDocumento: '123',
        telefono: '300',
      },
    },
  });
  try {
    await datosCliente({ id: 'm1', contrasena: 'mala', motivo: 'contactar', usuario: { _id: 'u9' } });
    ok(false, 'datos-cliente: contraseña incorrecta -> 401');
  } catch (e) {
    ok(e.statusCode === 401, 'datos-cliente: contraseña incorrecta -> 401');
  }

  reiniciar();
  const datos = await datosCliente({ id: 'm1', contrasena: 'Secreto123', motivo: 'contactar al cliente', usuario: { _id: 'u9' } });
  ok(
    datos.cliente.nombres === 'Ana' && datos.cliente.correo === 'ana@x.com' && datos.cliente.numeroDocumento === '123',
    'datos-cliente: devuelve los datos del cliente'
  );
  ok(datos.codigoPresolicitud === 'PRE-2026-0001', 'datos-cliente: incluye la pre-solicitud');
  ok(
    historialCreado.some((h) => h.accion === 'Consulta datos cliente' && h.comentario === 'contactar al cliente'),
    'datos-cliente: audita la consulta con el motivo (RF-29)'
  );
  ok(notificaciones.length === 0, 'datos-cliente: no dispara notificaciones');

  // ---- 8) Validadores de trazabilidad (9) ----
  let r = await correr(validarCambiarEtapa, { etapaActual: 'Resultados' });
  ok(r.isEmpty(), 'validar cambiar-etapa: etapa válida pasa');
  r = await correr(validarCambiarEtapa, { etapaActual: 'Inventada' });
  ok(!r.isEmpty(), 'validar cambiar-etapa: etapa inválida rechazada');

  r = await correr(validarAsignar, { analista: '507f1f77bcf86cd799439011', accion: 'Asignar', motivo: 'carga' });
  ok(r.isEmpty(), 'validar asignar: payload válido pasa');
  r = await correr(validarAsignar, { analista: '507f1f77bcf86cd799439011', accion: 'Asignar' });
  ok(!r.isEmpty(), 'validar asignar: sin motivo rechazado (RF-28)');
  r = await correr(validarAsignar, { analista: 'x', accion: 'Borrar', motivo: 'carga' });
  ok(r.array().length >= 2, 'validar asignar: analista y acción inválidos -> 2+ errores');

  r = await correr(validarReabrir, { motivo: 'corrección' });
  ok(r.isEmpty(), 'validar reabrir: motivo válido pasa');
  r = await correr(validarReabrir, { motivo: 'x', etapaDestino: 'Inventada' });
  ok(!r.isEmpty(), 'validar reabrir: destino inválido rechazado');

  r = await correr(validarDatosCliente, { contrasena: 'x', motivo: 'contactar' });
  ok(r.isEmpty(), 'validar datos-cliente: payload válido pasa');
  r = await correr(validarDatosCliente, { contrasena: 'x' });
  ok(!r.isEmpty(), 'validar datos-cliente: sin motivo rechazado (RF-29)');
  r = await correr(validarDatosCliente, { motivo: 'x' });
  ok(!r.isEmpty(), 'validar datos-cliente: sin contraseña rechazado');

  // ---- 9) Inmutabilidad del historial (1) ----
  const pre = HistorialMuestra.schema?.s?.hooks?._pres;
  const tieneHook = (nombre) => Boolean(pre && (pre.get ? pre.get(nombre) : pre[nombre]));
  ok(
    ['findOneAndUpdate', 'findOneAndReplace', 'updateOne', 'updateMany', 'replaceOne', 'findOneAndDelete', 'deleteOne', 'deleteMany', 'save'].every(tieneHook),
    'historial: hooks de inmutabilidad registrados, incluido findOneAndReplace (RF-24)'
  );

  console.log(`\nTrazabilidad/código ciego: ${total} aserciones, ${fallos} fallo(s)`);
  if (fallos > 0) process.exit(1);
})();
