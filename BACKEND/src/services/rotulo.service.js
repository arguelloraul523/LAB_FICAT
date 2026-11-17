// ============================================================
// Rótulo imprimible de la muestra (RF-21).
// HTML listo para imprimir en papel de 58 mm o 80 mm (CSS @page).
// Contiene: código, prioridad, turno, fecha de ingreso y los
// parámetros de cada análisis (cantidad, envase, conservación y
// tiempo máximo de traslado).
// NO lleva NINGÚN dato del cliente (RF-22, ceguera del Analista).
// ============================================================

const ANCHOS_ROTULO = ['58', '80'];

// Escapa texto antes de inyectarlo en el HTML.
const escaparHtml = (texto) =>
  String(texto ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

// Genera el HTML del rótulo. `ancho` es '58' o '80' (mm).
const htmlRotulo = ({ muestra, ancho = '58' }) => {
  const mm = ANCHOS_ROTULO.includes(String(ancho)) ? String(ancho) : '58';

  const codigo = escaparHtml(muestra.codigoMuestra || 'SIN-CODIGO');
  const prioridad = escaparHtml(muestra.prioridad || '—');
  const turno = escaparHtml(muestra.numeroTurno ?? '—');
  const fecha = escaparHtml(new Date(muestra.fechaIngreso || Date.now()).toLocaleString('es-CO'));

  const examenes = (muestra.examenes || [])
    .map((item) => item.examen)
    .filter(Boolean)
    .map((examen) => {
      const filas = [
        `Cantidad: ${examen.cantidadRequerida ?? '—'} ${examen.unidadMedida || ''}`.trim(),
        `Envase: ${examen.tipoEnvase || '—'}`,
        `Conservación: ${examen.temperaturaConservacion || 'Ambiente'}`,
        `Traslado máx.: ${examen.tiempoMaxTrasladoHoras ? `${examen.tiempoMaxTrasladoHoras} h` : 'No aplica'}`,
      ];
      return `<li><strong>${escaparHtml(examen.nombre)}</strong><br>${filas
        .map(escaparHtml)
        .join('<br>')}</li>`;
    })
    .join('\n      ');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Rótulo ${codigo}</title>
<style>
  @page { size: ${mm}mm auto; margin: 3mm; }
  * { box-sizing: border-box; }
  body { width: ${Number(mm) - 6}mm; margin: 0; font-family: "Courier New", monospace; font-size: 9pt; color: #000; }
  .codigo { font-size: 14pt; font-weight: bold; text-align: center; letter-spacing: 1px; }
  .meta { text-align: center; font-size: 8pt; margin-top: 1mm; }
  hr { border: none; border-top: 1px dashed #000; margin: 2mm 0; }
  .titulo { font-weight: bold; font-size: 8pt; margin-bottom: 1mm; }
  ul { margin: 0; padding-left: 4mm; }
  li { margin-bottom: 1.5mm; font-size: 8pt; }
</style>
</head>
<body>
  <div class="codigo">${codigo}</div>
  <div class="meta">Prioridad ${prioridad} · Turno ${turno}</div>
  <div class="meta">Ingreso: ${fecha}</div>
  <hr>
  <div class="titulo">Parámetros</div>
  <ul>
      ${examenes || '<li>Sin parámetros registrados</li>'}
  </ul>
</body>
</html>`;
};

// ============================================================
// Hoja de trabajo imprimible (Fase 6, RF-22).
// Papel A4 con código, parámetros, estado/avance y casillas para
// escribir los resultados. NO lleva NINGÚN dato del cliente.
// ============================================================

const htmlHojaTrabajo = ({ muestra }) => {
  const codigo = escaparHtml(muestra.codigoMuestra || 'SIN-CODIGO');
  const prioridad = escaparHtml(muestra.prioridad || '—');
  const turno = escaparHtml(muestra.numeroTurno ?? '—');
  const fecha = escaparHtml(new Date(muestra.fechaIngreso || Date.now()).toLocaleString('es-CO'));
  const estado = escaparHtml(muestra.estado || '—');
  const etapa = escaparHtml(muestra.etapaActual || '—');
  const avance = escaparHtml(muestra.porcentajeAvance ?? '—');
  const temperatura = escaparHtml(muestra.temperaturaRecepcion ?? '—');
  const cantidad = escaparHtml(`${muestra.cantidadRecibida ?? '—'} ${muestra.unidadMedida || ''}`.trim());
  const empaque = escaparHtml(muestra.estadoEmpaque || '—');

  const filas = (muestra.examenes || [])
    .filter((item) => item && item.examen)
    .map((item) => {
      const examen = item.examen;
      const parametros = [
        `${examen.cantidadRequerida ?? '—'} ${examen.unidadMedida || ''}`.trim(),
        `Envase: ${examen.tipoEnvase || '—'}`,
        `Conservación: ${examen.temperaturaConservacion || 'Ambiente'}`,
        `Traslado máx.: ${examen.tiempoMaxTrasladoHoras ? `${examen.tiempoMaxTrasladoHoras} h` : 'No aplica'}`,
      ]
        .map(escaparHtml)
        .join('<br>');
      const resultado = escaparHtml(item.resultado || '');
      return `<tr>
        <td>${escaparHtml(examen.nombre)}</td>
        <td>${parametros}</td>
        <td class="casilla">${resultado}</td>
        <td class="casilla fecha">${item.fechaResultado ? escaparHtml(new Date(item.fechaResultado).toLocaleDateString('es-CO')) : ''}</td>
      </tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Hoja de trabajo ${codigo}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #000; }
  h1 { font-size: 14pt; margin: 0 0 2mm; }
  .sello { display: flex; justify-content: space-between; border: 1px solid #000; padding: 3mm; margin-bottom: 4mm; }
  .codigo { font-size: 16pt; font-weight: bold; }
  .meta { font-size: 9pt; }
  .datos { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm; margin-bottom: 4mm; }
  .dato { border: 1px solid #000; padding: 2mm; font-size: 9pt; }
  .dato strong { display: block; font-size: 8pt; text-transform: uppercase; color: #333; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  th, td { border: 1px solid #000; padding: 2mm; vertical-align: top; }
  th { background: #eee; font-size: 8pt; text-transform: uppercase; }
  .casilla { height: 12mm; }
  .fecha { width: 20mm; }
  .firmas { display: flex; justify-content: space-between; gap: 10mm; margin-top: 12mm; }
  .firma { flex: 1; text-align: center; font-size: 9pt; }
  .firma hr { border: none; border-top: 1px solid #000; margin-top: 14mm; }
  .pie { margin-top: 4mm; font-size: 8pt; color: #333; text-align: center; }
</style>
</head>
<body>
  <h1>Hoja de trabajo del laboratorio</h1>
  <div class="sello">
    <div>
      <div class="codigo">${codigo}</div>
      <div class="meta">Prioridad ${prioridad} · Turno ${turno}</div>
    </div>
    <div class="meta" style="text-align:right">
      Ingreso: ${fecha}<br>
      Estado: ${estado} · Etapa: ${etapa} · Avance: ${avance}%
    </div>
  </div>

  <div class="datos">
    <div class="dato"><strong>Cantidad recibida</strong>${cantidad}</div>
    <div class="dato"><strong>Temperatura de recepción</strong>${temperatura} °C</div>
    <div class="dato"><strong>Estado del empaque</strong>${empaque}</div>
    <div class="dato"><strong>Fecha de trabajo</strong>${escaparHtml(new Date().toLocaleDateString('es-CO'))}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:25%">Análisis</th>
        <th style="width:35%">Parámetros</th>
        <th>Resultado</th>
        <th class="fecha">Fecha</th>
      </tr>
    </thead>
    <tbody>
      ${filas || '<tr><td colspan="4">Sin parámetros registrados</td></tr>'}
    </tbody>
  </table>

  <div class="firmas">
    <div class="firma">Analista<hr>${escaparHtml(muestra.analista?.nombres || '')} ${escaparHtml(muestra.analista?.apellidos || '')}</div>
    <div class="firma">Validación / firma<hr>&nbsp;</div>
  </div>

  <div class="pie">Documento técnico anónimo: no contiene datos del cliente (RF-22).</div>
</body>
</html>`;
};

export { ANCHOS_ROTULO, escaparHtml, htmlRotulo, htmlHojaTrabajo };
