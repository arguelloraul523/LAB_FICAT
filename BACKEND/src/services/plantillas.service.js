// ============================================================
// Plantillas de mensaje (RF-14).
// Renderiza el cuerpo/asunto reemplazando {{clave}}. SIN caché: el
// servicio de notificación lee la plantilla de la BD en cada envío, así
// editar una plantilla cambia el siguiente correo sin reiniciar.
// ============================================================

// Reemplaza {{clave}} (o {{objeto.clave}}) por variables[clave].
// Una variable ausente se reemplaza por cadena vacía.
const renderPlantilla = (texto, variables = {}) =>
  String(texto ?? '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, clave) => {
    const valor = clave
      .split('.')
      .reduce((acc, parte) => (acc === null || acc === undefined ? undefined : acc[parte]), variables);
    return valor === undefined || valor === null ? '' : String(valor);
  });

// Extrae las variables usadas por una plantilla (útil para validar).
const variablesDe = (texto) => {
  const encontradas = new Set();
  String(texto ?? '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, clave) => {
    encontradas.add(clave);
    return '';
  });
  return [...encontradas];
};

export { renderPlantilla, variablesDe };
