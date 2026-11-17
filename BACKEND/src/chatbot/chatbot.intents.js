// ============================================================
// Clasificador determinístico del asistente (sin IA).
// La misma rutina sirve para visitantes y usuarios autenticados.
// ============================================================

/** Límite de mensajes (pares) por conversación. */
const LIMITE_MENSAJES = 40;

/**
 * @param {unknown} valor
 * @returns {string}
 */
function normalizarTexto(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PALABRAS_IGNORADAS = new Set([
  'a', 'al', 'algo', 'algun', 'alguna', 'algunas', 'algunos', 'ante', 'antes',
  'como', 'con', 'cual', 'cuales', 'cuando', 'de', 'del', 'desde', 'donde',
  'dos', 'el', 'ella', 'ellas', 'ellos', 'en', 'entre', 'era', 'es', 'esa',
  'ese', 'eso', 'esta', 'este', 'esto', 'fue', 'ha', 'hacia', 'hasta', 'hay',
  'la', 'las', 'le', 'les', 'lo', 'los', 'mas', 'me', 'mi', 'mis', 'mucho',
  'muchos', 'muy', 'no', 'nos', 'o', 'otra', 'otro', 'para', 'pero', 'poco',
  'por', 'porque', 'que', 'quien', 'se', 'sin', 'sobre', 'su', 'sus', 'te',
  'tiene', 'tienen', 'tu', 'tus', 'un', 'una', 'unas', 'uno', 'unos', 'y', 'ya',
  // Términos genéricos del dominio
  'analisis', 'atienden', 'ayuda', 'ayudar', 'catalogo', 'categoria',
  'categorias', 'consulta', 'consultar', 'costo', 'costos', 'cuesta',
  'cuestan', 'cuanto', 'cuanta', 'cumplir', 'debe', 'deben', 'debo',
  'disponen', 'examen', 'examenes', 'favor', 'gustaria', 'hace', 'hacen',
  'hacer', 'informacion', 'laboratorio', 'llevar', 'manejan', 'muestra',
  'muestras', 'necesito', 'ofrecen', 'poder', 'podria', 'precio', 'precios',
  'prestan', 'puede', 'pueden', 'quiero', 'quisiera', 'realiza', 'realizan',
  'reciben', 'requisito', 'requisitos', 'saber', 'ser', 'servicio',
  'servicios', 'solicitar', 'solicito', 'son', 'tengo', 'tipo', 'tipos',
  'tienen', 'ustedes',
]);

/**
 * Palabra más significativa del mensaje para filtrar el catálogo.
 *
 * @param {string} mensaje
 * @returns {string}
 */
export function extraerTermino(mensaje) {
  const palabras = normalizarTexto(mensaje)
    .split(' ')
    .filter((palabra) => palabra.length >= 2 && !PALABRAS_IGNORADAS.has(palabra));

  if (palabras.length === 0) return '';
  return palabras.sort((a, b) => b.length - a.length)[0];
}

/**
 * @param {string} mensaje
 * @param {boolean} autenticado
 * @returns {string}
 */
export function clasificarIntencion(mensaje, autenticado) {
  const m = normalizarTexto(mensaje);

  // Números del menú
  if (m === '1') return 'examenes';
  if (m === '2') return 'requisitos';
  if (m === '3') return 'pago';
  if (m === '4') return autenticado ? 'estado' : 'verificacion_sena';
  if (m === '5') return autenticado ? 'rechazo' : 'login_requerido';
  if (m === '6') return 'asesor';
  if (m === '0' || m === 'menu' || m === 'volver') return 'menu';

  if (/rechaz|devol|reenviar/.test(m)) return 'rechazo';
  if (/estado|orden|solicitud|donde|como va|etapa/.test(m)) {
    return autenticado ? 'estado' : 'login_requerido';
  }

  // Informes y resultados exigen sesión; se revisan antes de "examen".
  if (/informe|resultado|descarg/.test(m)) return 'informe';

  if (/tipos? de muestra/.test(m)) return 'tipos_muestra';
  if (/categor/.test(m)) return 'categorias';
  if (/exam|precio|cost|cuest|cuant|catalogo/.test(m)) return 'examenes';
  if (/requisit|muestra|envase|temperat|envio/.test(m)) return 'requisitos';

  if (/pag[oa]|consign|transf|comprobant|cupon|cuenta/.test(m)) return 'pago';
  if (/sena|verific|carne|exoner|aprendiz/.test(m)) return 'verificacion_sena';
  if (/asesor|humano|persona|agente|ayuda personal/.test(m)) return 'asesor';
  if (/hola|buenos|buenas|saludos|hi|hey/.test(m)) return 'menu';
  if (/gracia|chao|adios|hasta luego/.test(m)) return 'despedida';

  return 'texto_libre';
}

export { LIMITE_MENSAJES };
