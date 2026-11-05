import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

// ============================================================
// Exportación del reporte (RF-30): CSV, Excel (.xlsx) y PDF.
// El reporte es una tabla de métrica/valor.
// ============================================================

const FILAS = [
  ['volumenMuestras', 'Volumen de muestras'],
  ['rechazadas', 'Muestras rechazadas'],
  ['porcentajeRechazadas', '% rechazadas'],
  ['facturadoExternos', 'Total facturado a externos'],
  ['exoneradoSena', 'Monto exonerado SENA'],
];

const aFilas = (resumen) => FILAS.map(([clave, etiqueta]) => ({ metrica: etiqueta, valor: resumen[clave] ?? 0 }));

const aCsv = (resumen) => {
  const lineas = ['Metrica,Valor'];
  aFilas(resumen).forEach((f) => lineas.push(`"${f.metrica}",${f.valor}`));
  return `${lineas.join('\n')}\n`;
};

const aXlsx = async (resumen) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'LABFICAT';
  const ws = wb.addWorksheet('Reporte');
  ws.columns = [
    { header: 'Métrica', key: 'metrica', width: 38 },
    { header: 'Valor', key: 'valor', width: 20 },
  ];
  ws.getRow(1).font = { bold: true };
  aFilas(resumen).forEach((f) => ws.addRow(f));
  ws.addRow({});
  ws.addRow({ metrica: 'Rango', valor: `${resumen.desde || 'inicio'} a ${resumen.hasta || 'hoy'}` });
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

const aPdf = (resumen) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).text('Reporte del Laboratorio (SENA)', { align: 'center' });
    doc.moveDown();
    doc
      .fontSize(10)
      .fillColor('#333')
      .text(`Rango: ${resumen.desde || 'inicio'} a ${resumen.hasta || 'hoy'}`, { align: 'center' });
    doc.moveDown(1.5);
    doc.fillColor('#000').fontSize(12);
    aFilas(resumen).forEach((f) => {
      doc.text(`${f.metrica}: ${f.valor}`);
      doc.moveDown(0.4);
    });
    doc.end();
  });

export { aCsv, aXlsx, aPdf, FILAS };
