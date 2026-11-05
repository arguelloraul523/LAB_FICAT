// ============================================================
// Respuestas del asistente.
// Solo se formatea información entregada por MongoDB.
// ============================================================

const MENU = [{ numero: 0, texto: 'Volver al menú principal', accion: 'menu' }];

/**
 * @param {string} intencion
 * @param {string} respuesta
 * @param {string} animacion
 * @param {Array<{numero:number,texto:string,accion?:string}>} [opciones]
 */
function base(intencion, respuesta, animacion, opciones) {
  return {
    respuesta,
    intencion,
    animacion,
    usoLlm: false,
    tokensEntrada: 0,
    tokensSalida: 0,
    ...(opciones ? { opciones } : {}),
  };
}

/**
 * @param {unknown} valor
 * @returns {string}
 */
function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

/**
 * @param {number|string|null|undefined} precio
 * @returns {string}
 */
function formatearPrecio(precio) {
  const valor = Number(precio);
  if (!Number.isFinite(valor)) return 'valor no registrado';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}

/**
 * @param {Date|string|null|undefined} fecha
 * @returns {string}
 */
function fechaCorta(fecha) {
  if (!fecha) return 'sin fecha';
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return 'sin fecha';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(valor);
}

function menuPublico() {
  return base(
    'menu_principal',
    '👋 ¡Hola! Bienvenido(a) al **LABFICAT** — Laboratorio de Caracterización Fisicoquímica de Alimentos del SENA. Puedo consultar el catálogo público. ¿Qué necesitas?',
    'saludo',
    [
      { numero: 1, texto: '¿Qué exámenes realizan y cuánto cuestan?' },
      { numero: 2, texto: '¿Qué requisitos debe cumplir mi muestra?' },
      { numero: 3, texto: '¿Cómo hago el pago?' },
      { numero: 4, texto: '¿Cómo me verifico como SENA?' },
      { numero: 5, texto: '¿En qué va mi solicitud?', accion: 'login' },
      { numero: 6, texto: 'Hablar con un asesor', accion: 'asesor' },
    ]
  );
}

/**
 * @param {{nombres?:string, rol?:{nombre?:string}}|null} usuario
 */
function menuAutenticado(usuario) {
  const nombre = texto(usuario?.nombres) || 'usuario';
  return base(
    'menu_principal',
    `👋 Hola, **${nombre}**. Ya puedo consultar el catálogo y tus datos del laboratorio. ¿Qué necesitas?`,
    'saludo',
    [
      { numero: 1, texto: 'Conocer exámenes y precios' },
      { numero: 2, texto: 'Saber qué muestra debo llevar' },
      { numero: 3, texto: 'Cómo pagar o consultar cuentas' },
      { numero: 4, texto: 'Estado de mi orden o de mi pago' },
      { numero: 5, texto: 'Mi muestra fue rechazada' },
      { numero: 6, texto: 'Hablar con un asesor', accion: 'asesor' },
    ]
  );
}

/**
 * @param {any[]} examenes
 * @param {string} [termino]
 */
function listaExamenes(examenes, termino = '') {
  const lineas = examenes.map((examen) => {
    const meta = [texto(examen?.categoria?.nombre), texto(examen?.tipoMuestra?.nombre)]
      .filter(Boolean)
      .join(' · ');
    const dias = Number(examen?.tiempoRespuestaDias);
    const tiempo = Number.isFinite(dias) ? `${dias} día(s) hábiles` : 'tiempo no registrado';
    return `• **${texto(examen?.nombre) || 'Examen sin nombre'}**${meta ? ` (${meta})` : ''} — ${formatearPrecio(examen?.precio)} · ${tiempo}`;
  });

  const encabezado = termino
    ? `Exámenes encontrados en el catálogo para «${termino}»:`
    : 'Exámenes disponibles en el catálogo del laboratorio:';

  return base(
    'catalogo',
    `${encabezado}\n\n${lineas.join('\n')}\n\n¿Quieres consultar los requisitos de muestra?`,
    'buscar',
    MENU
  );
}

/**
 * @param {any[]} examenes
 * @param {string} [termino]
 */
function listaRequisitos(examenes, termino = '') {
  const lineas = examenes.map((examen) => {
    const partes = [];
    const cantidad = Number(examen?.cantidadRequerida);
    if (Number.isFinite(cantidad)) {
      const unidad = texto(examen?.unidadMedida);
      partes.push(`cantidad: ${cantidad}${unidad ? ` ${unidad}` : ''}`);
    }
    if (texto(examen?.tipoEnvase)) partes.push(`envase: ${texto(examen.tipoEnvase)}`);
    if (texto(examen?.temperaturaConservacion)) {
      partes.push(`temperatura: ${texto(examen.temperaturaConservacion)}`);
    }
    const horas = Number(examen?.tiempoMaxTrasladoHoras);
    if (Number.isFinite(horas)) partes.push(`traslado máximo: ${horas} hora(s)`);

    return `• **${texto(examen?.nombre) || 'Examen sin nombre'}**: ${
      partes.length > 0 ? partes.join(' · ') : 'sin requisitos registrados en el catálogo'
    }`;
  });

  const encabezado = termino
    ? `Requisitos de muestra para «${termino}»:`
    : 'Requisitos de muestra registrados en el catálogo:';

  return base('requisitos', `${encabezado}\n\n${lineas.join('\n')}`, 'portapapeles', MENU);
}

/**
 * @param {any[]} categorias
 */
function listaCategorias(categorias) {
  const lineas = categorias.map((categoria) => {
    const descripcion = texto(categoria?.descripcion);
    return `• **${texto(categoria?.nombre) || 'Categoría sin nombre'}**${descripcion ? `: ${descripcion}` : ''}`;
  });
  return base(
    'categorias',
    `Categorías registradas en el catálogo:\n\n${lineas.join('\n')}`,
    'buscar',
    MENU
  );
}

/**
 * @param {any[]} tipos
 */
function listaTiposMuestra(tipos) {
  const lineas = tipos.map((tipo) => {
    const descripcion = texto(tipo?.descripcion);
    return `• **${texto(tipo?.nombre) || 'Tipo sin nombre'}**${descripcion ? `: ${descripcion}` : ''}`;
  });
  return base(
    'tipos_muestra',
    `Tipos de muestra registrados en el catálogo:\n\n${lineas.join('\n')}`,
    'portapapeles',
    MENU
  );
}

/**
 * @param {any[]} cuentas
 */
function listaCuentas(cuentas) {
  const lineas = cuentas.map(
    (cuenta) =>
      `• **${texto(cuenta?.banco)}** — ${texto(cuenta?.tipoCuenta)}: ${texto(cuenta?.numeroCuenta)} · titular: ${texto(cuenta?.titular)}`
  );
  return base(
    'pago',
    `Cuentas oficiales activas registradas en el backend:\n\n${lineas.join('\n')}\n\nEl pago es manual: después de consignar o transferir, reporta el comprobante en la plataforma.`,
    'pago',
    MENU
  );
}

/**
 * @param {{solicitudes:any[], muestras:any[], pagos:any[]}} datos
 */
function estadoCliente(datos) {
  const { solicitudes = [], muestras = [], pagos = [] } = datos;
  const bloques = [];

  if (solicitudes.length > 0) {
    bloques.push('**Mis solicitudes recientes:**');
    solicitudes.forEach((solicitud) => {
      const tipo = texto(solicitud?.tipoMuestra?.nombre);
      bloques.push(
        `• **${texto(solicitud?.codigoPresolicitud) || 'Sin código'}** — ${texto(solicitud?.estado) || 'sin estado'}${tipo ? ` · ${tipo}` : ''}`
      );

      const muestra = muestras.find(
        (item) => String(item?.solicitud) === String(solicitud?._id)
      );
      if (muestra) {
        const avance = Number(muestra.porcentajeAvance);
        bloques.push(
          `  Muestra **${texto(muestra.codigoMuestra) || 'sin código'}** · etapa: ${texto(muestra.etapaActual)}${Number.isFinite(avance) ? ` (${avance}%)` : ''} · estado: ${texto(muestra.estado)}${muestra.prioridad ? ` · prioridad: ${muestra.prioridad}` : ''}`
        );
      } else {
        bloques.push('  Aún no hay muestra recibida para esta solicitud.');
      }
    });
  }

  if (pagos.length > 0) {
    bloques.push('**Mis pagos recientes:**');
    pagos.forEach((pago) => {
      const cupon = texto(pago?.cupon?.codigoReferencia);
      bloques.push(
        `• ${texto(pago?.estado) || 'sin estado'} · ${formatearPrecio(pago?.valorReportado)} · cargado el ${fechaCorta(pago?.fechaCarga)}${cupon ? ` · cupón ${cupon}` : ''}`
      );
    });
  }

  if (bloques.length === 0) {
    return base(
      'estado',
      'No encontré solicitudes, muestras ni pagos asociados a tu cuenta en el backend.',
      'estado',
      MENU
    );
  }

  return base('estado', bloques.join('\n'), 'estado', MENU);
}

/**
 * @param {string} recurso
 * @param {string} [termino]
 */
function sinResultados(recurso, termino = '') {
  const detalle = termino ? ` para «${termino}»` : '';
  return base(
    'sin_resultados',
    `La consulta al backend no devolvió ${recurso}${detalle}. Puedes intentar con otro término o volver al menú.`,
    'confundido',
    MENU
  );
}

function noReconocida(autenticado = false) {
  return base(
    'no_reconocida',
    autenticado
      ? 'No reconocí tu pregunta y el catálogo no devolvió coincidencias. Puedo consultar exámenes, precios, requisitos, categorías, tipos de muestra y tus datos del laboratorio.'
      : 'No reconocí tu pregunta y el catálogo no devolvió coincidencias. Puedo consultar exámenes, precios, requisitos, categorías y tipos de muestra. Si tu consulta es sobre una orden, inicia sesión.',
    'confundido',
    autenticado
      ? MENU
      : [{ numero: 5, texto: 'Iniciar sesión', accion: 'login' }, ...MENU]
  );
}

/**
 * @param {string} mensaje
 */
function noDisponible(mensaje) {
  return base('no_disponible', mensaje, 'triste', MENU);
}

function pagoPublico() {
  return noDisponible(
    'Para ver las cuentas oficiales de recaudo necesitas iniciar sesión: el backend exige un token JWT para consultarlas. Desde este chat no mostraré números de cuenta que no provengan de una sesión autenticada.'
  );
}

function rechazoNoDisponible() {
  return noDisponible(
    'La consulta de rechazos requiere una sesión autenticada y propiedad del registro. En esta versión del asistente ese detalle no está habilitado; puedes revisarlo en la plataforma.'
  );
}

function informeNoDisponible() {
  return noDisponible(
    'Los informes y resultados se consultan en la plataforma con tu sesión. El asistente no descarga ni interpreta informes.'
  );
}

function verificacionSenaNoDisponible() {
  return noDisponible(
    'La verificación SENA se gestiona desde la plataforma con tu cuenta. El asistente no consulta documentos ni estados de verificación.'
  );
}

function estadoNoDisponible() {
  return noDisponible(
    'El asistente solo muestra datos personales al rol **Cliente**. Para gestionar solicitudes, muestras o pagos usa el panel administrativo.'
  );
}

function loginRequerido() {
  return base(
    'login_requerido',
    'Para consultar el estado de tu solicitud o tus pagos necesitas iniciar sesión en la plataforma.',
    'carnet',
    [
      { numero: 5, texto: 'Iniciar sesión', accion: 'login' },
      ...MENU,
    ]
  );
}

function asesor() {
  return base(
    'asesor',
    'Este asistente no tiene un canal de asesor en tiempo real. Si necesitas ayuda adicional, registra tu solicitud en el módulo de PQR de la plataforma o comunícate con el laboratorio.',
    'asesor',
    MENU
  );
}

function despedida() {
  return base('despedida', '¡Gracias por contactarnos! Si necesitas algo más, aquí estaré. 😊', 'check');
}

function limite() {
  return base(
    'limite',
    'Has alcanzado el límite de mensajes de esta conversación. Inicia una nueva conversación o contacta al laboratorio por los canales oficiales.',
    'check'
  );
}

function errorInterno() {
  return base(
    'error',
    'No pude completar la consulta al backend. Inténtalo de nuevo en unos segundos.',
    'triste',
    MENU
  );
}

export {
  menuPublico,
  menuAutenticado,
  listaExamenes,
  listaRequisitos,
  listaCategorias,
  listaTiposMuestra,
  listaCuentas,
  estadoCliente,
  sinResultados,
  noReconocida,
  noDisponible,
  pagoPublico,
  rechazoNoDisponible,
  informeNoDisponible,
  verificacionSenaNoDisponible,
  estadoNoDisponible,
  loginRequerido,
  asesor,
  despedida,
  limite,
  errorInterno,
};
