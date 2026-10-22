// ============================================================
// Verificación de notificaciones/plantillas, cron y asistente IA (RF-14, RF-32, RF-11).
// SIN conectar a MongoDB.
// Uso:  node verificacion/notificaciones-plantillas-cron-ia.js   (sale con código 1 si algo falla)
// Criterios del usuario:
//   - editar una plantilla cambia el siguiente correo sin reiniciar,
//   - el cron no repite alertas,
//   - el asistente usa catálogo + parámetros y su clave solo vive en .env.
// ============================================================
import { validationResult } from 'express-validator';
import { renderPlantilla, variablesDe } from '../src/services/plantillas.service.js';
import { configurarNotificaciones, notificar } from '../src/services/notificaciones.service.js';
import { configurarCola, procesarCola, encolarCorreo } from '../src/services/colaNotificaciones.service.js';
import { ejecutarAlertasRetraso } from '../src/services/cron.service.js';
import { construirMensajes, chat } from '../src/services/asistente.service.js';
import { validarChatAsistente } from '../src/validators/asistente.validators.js';
import Notificacion from '../src/models/Notificacion.js';
import MensajeAsistente from '../src/models/MensajeAsistente.js';
import Examen from '../src/models/Examen.js';
import TipoMuestra from '../src/models/TipoMuestra.js';
import CategoriaAnalisis from '../src/models/CategoriaAnalisis.js';
import ParametroSistema from '../src/models/ParametroSistema.js';
import OpcionAsistenteIA from '../src/models/OpcionAsistenteIA.js';
import Muestra from '../src/models/Muestra.js';
import CuponPago from '../src/models/CuponPago.js';
import Cotizacion from '../src/models/Cotizacion.js';
import Solicitud from '../src/models/Solicitud.js';
import Pago from '../src/models/Pago.js';
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
  // ---- Dobles de BD base ----
  const creadas = [];
  let contador = 0;
  Notificacion.create = async (d) => {
    creadas.push(d);
    return { ...d, _id: `n${++contador}` };
  };
  const actualizadas = [];
  Notificacion.findByIdAndUpdate = async (id, datos) => {
    actualizadas.push({ id, datos });
    return { _id: id, ...datos };
  };
  // Cola con enviador exitoso por defecto (evita SMTP/ruido).
  // auto:false => la cola solo avanza con procesarCola() (determinista en pruebas).
  configurarCola({ enviador: async () => true, maxIntentos: 3, auto: false });

  // ---- 1) Render de plantillas (5) ----
  ok(
    renderPlantilla('Hola {{nombre}}, orden {{orden}}', { nombre: 'Ana', orden: 'PRE-2026-0001' }) ===
      'Hola Ana, orden PRE-2026-0001',
    'renderPlantilla: reemplaza variables simples'
  );
  ok(renderPlantilla('{{a.b}}', { a: { b: 'X' } }) === 'X', 'renderPlantilla: soporta {{a.b}}');
  ok(renderPlantilla('Valor: {{nada}}.', {}) === 'Valor: .', 'renderPlantilla: variable ausente -> vacío');
  ok(
    JSON.stringify(variablesDe('{{a}} {{b}} {{a}}')) === JSON.stringify(['a', 'b']),
    'variablesDe: extrae claves únicas'
  );
  ok(renderPlantilla(null, {}) === '', 'renderPlantilla: texto nulo -> vacío');

  // ---- 2) Servicio único con plantilla de BD inyectada (6) ----
  let plantillas = {
    'pago-aprobado': {
      _id: 'pl1',
      codigo: 'pago-aprobado',
      canal: 'Ambos',
      asunto: 'Pago de {{orden}} aprobado',
      cuerpo: 'Hola {{nombre}}, tu pago {{orden}} fue aprobado.',
    },
  };
  configurarNotificaciones({ buscarPlantilla: async (codigo) => plantillas[codigo] || null });

  creadas.length = 0;
  const r1 = await notificar({
    codigo: 'pago-aprobado',
    usuario: { _id: 'u1', nombres: 'Ana', correo: 'ana@x.com' },
    solicitud: { _id: 's1' },
    variables: { orden: 'PRE-1' },
  });
  const app1 = creadas.find((n) => n.canal === 'App');
  const correo1 = creadas.find((n) => n.canal === 'Correo');
  ok(!!app1 && !!correo1 && creadas.length === 2, 'notificar (canal Ambos): crea registro App y Correo');
  ok(app1.estado === 'Enviado' && app1.intentos === 1, 'notificar: el App queda Enviado');
  ok(correo1.estado === 'Pendiente' && correo1.intentos === 0, 'notificar: el Correo queda Pendiente y encolado');
  ok(app1.asunto === 'Pago de PRE-1 aprobado', 'notificar: renderiza el asunto con variables');
  ok(app1.contenido === 'Hola Ana, tu pago PRE-1 fue aprobado.', 'notificar: renderiza el cuerpo con {{nombre}}');

  // Editar la plantilla cambia el SIGUIENTE envío (sin reiniciar).
  plantillas['pago-aprobado'] = { ...plantillas['pago-aprobado'], cuerpo: 'Nuevo texto {{nombre}}' };
  creadas.length = 0;
  const r2 = await notificar({
    codigo: 'pago-aprobado',
    usuario: { _id: 'u1', nombres: 'Ana', correo: 'ana@x.com' },
    variables: { orden: 'PRE-2' },
  });
  ok(
    creadas.find((n) => n.canal === 'App').contenido === 'Nuevo texto Ana',
    'editar la plantilla cambia el siguiente envío (sin cachear)'
  );
  ok(!!r1 && !!r2, 'notificar devuelve el resultado del envío');

  // Sin fallback para el código -> no envía.
  ok((await notificar({ codigo: 'inexistente', usuario: { _id: 'u1' } })) === null, 'notificar: plantilla desconocida -> null');

  // ---- 3) Cola con reintentos (3) ----
  await procesarCola(); // drena los correos encolados en la sección 2
  configurarNotificaciones({ buscarPlantilla: async () => null }); // vuelve a fallback
  let intentos = 0;
  configurarCola({
    enviador: async () => {
      intentos += 1;
      if (intentos < 3) throw new Error('fallo transitorio');
      return true;
    },
    maxIntentos: 3,
  });
  actualizadas.length = 0;
  encolarCorreo({ notificacionId: 'nX', para: 'a@x.com', asunto: 'A', contenido: 'B', backoffMs: 1 });
  await procesarCola();
  ok(intentos === 3, 'cola: reintenta hasta lograrlo');
  ok(
    actualizadas.some((a) => a.datos.estado === 'Enviado' && a.datos.intentos === 3),
    'cola: registra estado Enviado con el intento final'
  );

  configurarCola({
    enviador: async () => {
      throw new Error('siempre falla');
    },
    maxIntentos: 2,
  });
  actualizadas.length = 0;
  encolarCorreo({ notificacionId: 'nY', para: 'a@x.com', asunto: 'A', contenido: 'B', backoffMs: 1 });
  await procesarCola();
  ok(
    actualizadas.some((a) => a.datos.estado === 'Fallido' && a.datos.intentos === 2 && /siempre falla/.test(a.datos.error)),
    'cola: tras agotar reintentos queda Fallido con el error'
  );

  // ---- 4) Cron: detección y no repetición (5) ----
  configurarCola({ enviador: async () => true, maxIntentos: 3 });
  const parametros = {
    diasAlertaRetraso: '5',
    correoProduccionCentros: '',
  };
  ParametroSistema.findOne = async ({ clave }) => (parametros[clave] !== undefined ? { valor: parametros[clave] } : null);

  const hoy = new Date();
  const viejo = new Date(hoy.getTime() - 10 * 24 * 60 * 60 * 1000);
  const muestraRetrasada = {
    _id: 'm1',
    codigoMuestra: 'A1-2026-0001',
    etapaActual: 'Análisis',
    estado: 'Aceptada',
    updatedAt: viejo,
    ultimaAlertaRetraso: null,
    solicitud: { usuario: 'u1', codigoPresolicitud: 'PRE-1' },
    save: async () => {},
  };
  Muestra.find = () => ({ populate: async () => [muestraRetrasada] });
  Usuario.findById = () => ({ select: async () => ({ _id: 'u1', nombres: 'Ana', correo: 'ana@x.com' }) });

  const cuponViejo = {
    _id: 'c1',
    codigoReferencia: 'CUP-2026-0001',
    fechaEmision: viejo,
    fechaLimitePago: new Date(hoy.getTime() + 5 * 24 * 60 * 60 * 1000),
    ultimaAlertaRetraso: null,
    cotizacion: 'cot1',
    save: async () => {},
  };
  CuponPago.find = async () => [cuponViejo];
  Cotizacion.findById = () => ({ select: async () => ({ solicitud: 's1' }) });
  Solicitud.findById = () => ({ select: async () => ({ _id: 's1', usuario: 'u1', codigoPresolicitud: 'PRE-1', estado: 'Pendiente de pago' }) });
  Pago.findOne = async () => null;

  const alerta1 = await ejecutarAlertasRetraso({ ahora: hoy });
  ok(alerta1.muestras === 1 && alerta1.cupones === 1, 'cron: detecta muestra y cupón sin avance');
  ok(
    muestraRetrasada.ultimaAlertaRetraso === hoy && cuponViejo.ultimaAlertaRetraso === hoy,
    'cron: marca ultimaAlertaRetraso en ambos'
  );

  const alerta2 = await ejecutarAlertasRetraso({ ahora: hoy });
  ok(alerta2.muestras === 0 && alerta2.cupones === 0, 'cron: segunda pasada NO repite alertas');

  // Exclusión: la query debe dejar fuera las terminales/rechazadas.
  let filtroMuestra = null;
  let filtroCupon = null;
  Muestra.find = (f) => {
    filtroMuestra = f;
    return { populate: async () => [] };
  };
  CuponPago.find = async (f) => {
    filtroCupon = f;
    return [];
  };
  await ejecutarAlertasRetraso({ ahora: hoy });
  ok(
    filtroMuestra &&
      filtroMuestra.etapaActual.$nin.includes('Finalizada') &&
      filtroMuestra.etapaActual.$nin.includes('Cancelada') &&
      filtroMuestra.estado.$ne === 'Rechazada',
    'cron: la query excluye Finalizada/Cancelada/Rechazada'
  );
  ok(
    filtroCupon && filtroCupon.fechaLimitePago.$gte && filtroCupon.fechaEmision.$lt,
    'cron: la query de cupones filtra por vigencia y antigüedad'
  );

  // ---- 5) Asistente IA (5) ----
  const contexto = 'CATÁLOGO: - Glucosa: $50000';
  const mensajes = construirMensajes({
    contexto,
    opcion: { prompt: 'Responde breve' },
    historial: [{ rol: 'asistente', contenido: 'Hola' }],
    mensaje: '¿Cuánto cuesta la glucosa?',
  });
  ok(mensajes[0].role === 'system' && mensajes[0].content.includes(contexto), 'asistente: el contexto va en el system prompt');
  ok(mensajes.some((m) => m.content === 'Instrucción: Responde breve'), 'asistente: usa el prompt de la opción');
  ok(mensajes[mensajes.length - 1].content === '¿Cuánto cuesta la glucosa?', 'asistente: la pregunta va al final');
  ok(mensajes.some((m) => m.role === 'assistant' && m.content === 'Hola'), 'asistente: incluye historial reciente');

  delete process.env.IA_API_KEY;
  let r503 = null;
  try {
    await chat({ mensaje: 'hola', usuario: { _id: 'u1' } });
    ok(false, 'asistente: sin IA_API_KEY -> 503');
  } catch (e) {
    r503 = e;
    ok(e.statusCode === 503, 'asistente: sin IA_API_KEY -> 503');
  }

  // Con clave y proveedor simulado.
  process.env.IA_API_KEY = 'clave-de-prueba';
  Examen.find = () => ({ select: () => ({ limit: async () => [] }) });
  TipoMuestra.find = () => ({ select: async () => [] });
  CategoriaAnalisis.find = () => ({ select: async () => [] });
  ParametroSistema.find = () => ({ select: async () => [] });
  OpcionAsistenteIA.findById = async () => null;
  const guardados = [];
  MensajeAsistente.find = () => ({ sort: () => ({ limit: async () => [] }) });
  MensajeAsistente.create = async (d) => {
    guardados.push(d);
    return { ...d, _id: `msg${guardados.length}` };
  };
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: 'La glucosa cuesta $50000.' } }] }),
  });
  const resp = await chat({ mensaje: '¿precio glucosa?', usuario: { _id: 'u1' } });
  ok(resp.respuesta === 'La glucosa cuesta $50000.', 'asistente: devuelve la respuesta del proveedor');
  ok(guardados.length === 2 && guardados[0].rol === 'usuario' && guardados[1].rol === 'asistente', 'asistente: persiste el par usuario/asistente');
  delete process.env.IA_API_KEY;

  // ---- 6) Validador del asistente (2) ----
  let rv = await correr(validarChatAsistente, { mensaje: 'hola' });
  ok(rv.isEmpty(), 'validar asistente: mensaje válido pasa');
  rv = await correr(validarChatAsistente, { mensaje: '   ' });
  ok(!rv.isEmpty(), 'validar asistente: mensaje vacío rechazado');

  console.log(`\nNotificaciones/cron/IA: ${total} aserciones, ${fallos} fallo(s)`);
  if (fallos > 0) process.exit(1);
})();
