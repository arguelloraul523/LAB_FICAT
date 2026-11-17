import CategoriaAnalisis from '../models/CategoriaAnalisis.js';
import Examen from '../models/Examen.js';
import MensajeAsistente from '../models/MensajeAsistente.js';
import OpcionAsistenteIA from '../models/OpcionAsistenteIA.js';
import ParametroSistema from '../models/ParametroSistema.js';
import TipoMuestra from '../models/TipoMuestra.js';

// ============================================================
// Asistente de IA (RF-11).
// El contexto se limita al CATÁLOGO y a los PARÁMETROS del laboratorio:
// nunca incluye datos de clientes. Las claves de API viven SOLO en .env
// (IA_API_KEY/IA_URL/IA_MODELO). El historial reciente se persiste por
// usuario en MensajeAsistente.
// ============================================================

const errorCon = (statusCode, mensaje) => {
  const err = new Error(mensaje);
  err.statusCode = statusCode;
  return err;
};

const MAX_HISTORIAL = 10;

// Construye el texto de contexto con catálogo + parámetros (solo lectura).
const construirContexto = async () => {
  const [examenes, tipos, categorias, parametros] = await Promise.all([
    Examen.find({ activo: true }).select('nombre descripcion precio tiempoRespuestaDias').limit(50),
    TipoMuestra.find().select('nombre'),
    CategoriaAnalisis.find().select('nombre'),
    ParametroSistema.find().select('clave valor descripcion'),
  ]);

  const lineas = ['CATÁLOGO DE ANÁLISIS:'];
  examenes.forEach((e) =>
    lineas.push(
      `- ${e.nombre}: $${e.precio}, respuesta ${e.tiempoRespuestaDias} día(s)` +
        (e.descripcion ? ` — ${e.descripcion}` : '')
    )
  );
  lineas.push(`TIPOS DE MUESTRA: ${tipos.map((t) => t.nombre).join(', ') || 'N/A'}`);
  lineas.push(`CATEGORÍAS: ${categorias.map((c) => c.nombre).join(', ') || 'N/A'}`);
  lineas.push('PARÁMETROS DEL LABORATORIO:');
  parametros.forEach((p) =>
    lineas.push(`- ${p.clave}: ${p.valor}` + (p.descripcion ? ` (${p.descripcion})` : ''))
  );
  return lineas.join('\n');
};

// Arma los mensajes para el proveedor (sistema + opción + historial + pregunta).
const construirMensajes = ({ contexto, opcion, historial = [], mensaje }) => {
  const sistema =
    'Eres el asistente virtual del Laboratorio del SENA. Responde ÚNICAMENTE con la ' +
    'información del catálogo y de los parámetros entregados. No inventes precios, ' +
    'tiempos ni datos de clientes; si algo no está en el contexto, indícalo.';
  const messages = [{ role: 'system', content: `${sistema}\n\n${contexto}` }];
  if (opcion?.prompt) messages.push({ role: 'system', content: `Instrucción: ${opcion.prompt}` });

  // `historial` viene del más reciente al más antiguo: se invierte.
  [...historial].reverse().forEach((h) => {
    messages.push({ role: h.rol === 'asistente' ? 'assistant' : 'user', content: h.contenido });
  });
  messages.push({ role: 'user', content: mensaje });
  return messages;
};

const chat = async ({ mensaje, opcionId, usuario }) => {
  const texto = String(mensaje || '').trim();
  if (!texto) throw errorCon(400, 'El mensaje es obligatorio');

  const apiKey = process.env.IA_API_KEY;
  if (!apiKey) {
    throw errorCon(503, 'El asistente IA no está configurado (falta IA_API_KEY en el entorno)');
  }

  const opcion = opcionId ? await OpcionAsistenteIA.findById(opcionId) : null;
  const contexto = await construirContexto();
  const historial = await MensajeAsistente.find({ usuario: usuario._id })
    .sort({ createdAt: -1 })
    .limit(MAX_HISTORIAL);

  // Persiste el turno del usuario para el "historial reciente".
  await MensajeAsistente.create({
    usuario: usuario._id,
    rol: 'usuario',
    contenido: texto,
    opcion: opcion?._id || null,
  });

  const messages = construirMensajes({ contexto, opcion, historial, mensaje: texto });
  const url = process.env.IA_URL || 'https://api.openai.com/v1/chat/completions';
  const modelo = process.env.IA_MODELO || 'gpt-4o-mini';

  let respuesta = '';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: modelo, messages }),
    });
    if (!res.ok) throw errorCon(502, `El proveedor de IA respondió con estado ${res.status}`);
    const data = await res.json();
    respuesta = data?.choices?.[0]?.message?.content || '';
  } catch (err) {
    if (err.statusCode) throw err;
    throw errorCon(502, `No se pudo contactar al asistente IA: ${err.message}`);
  }

  const guardado = await MensajeAsistente.create({
    usuario: usuario._id,
    rol: 'asistente',
    contenido: respuesta,
    opcion: opcion?._id || null,
  });

  return { respuesta, mensajeId: guardado._id, opcion: opcion?.textoOpcion || null };
};

export { construirContexto, construirMensajes, chat };
