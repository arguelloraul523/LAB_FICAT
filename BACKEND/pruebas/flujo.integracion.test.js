// ============================================================
// Prueba de integración del FLUJO COMPLETO (RF-01…RF-31).
// Registro -> pre-solicitud -> cotización -> firma -> cupón -> pago ->
// verificación -> recepción -> etapas -> informe -> encuesta -> descarga
// -> cierre, más una PQR.
//
// Usa supertest + mongodb-memory-server (base efímera). Criterio de
// cierre de la Fase 9: el flujo completo pasa en UNA sola prueba.
//
//   npm test
// ============================================================
process.env.JWT_SECRET = 'secreto-de-prueba-integracion';
process.env.NODE_ENV = 'test';

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';

import rutasApi from '../src/routes/index.js';
import { notFound, manejadorErrores } from '../src/middlewares/error.middleware.js';
import Rol from '../src/models/Rol.js';
import Usuario from '../src/models/Usuario.js';
import CuentaRecaudo from '../src/models/CuentaRecaudo.js';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use('/api', rutasApi);
app.use(notFound);
app.use(manejadorErrores);

let mongo;
const tokens = {};
const ids = {};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());

  const [admin, recepcionista, analista, cliente] = await Promise.all(
    ['Administrador', 'Recepcionista', 'Analista', 'Cliente'].map((nombre) =>
      Rol.create({ nombre, descripcion: nombre })
    )
  );

  const hash = await bcrypt.hash('Clave1234', 4);
  const crearUsuario = (rol, correo, extra = {}) =>
    Usuario.create({
      rol: rol._id,
      roles: [rol._id],
      nombres: 'Usuario',
      apellidos: 'Prueba',
      tipoDocumento: 'CC',
      numeroDocumento: correo,
      correo,
      telefono: '3000000000',
      contrasenaHash: hash,
      tipoUsuario: 'EXTERNO',
      activo: true,
      ...extra,
    });

  await crearUsuario(admin, 'admin@prueba.com');
  await crearUsuario(recepcionista, 'recepcion@prueba.com');
  const analistaDoc = await crearUsuario(analista, 'analista@prueba.com');
  ids.analista = analistaDoc._id;

  await CuentaRecaudo.create({
    banco: 'Banco de prueba',
    tipoCuenta: 'Ahorros',
    numeroCuenta: '000-0000001',
    titular: 'Laboratorio SENA',
    activa: true,
  });

  const login = await request(app)
    .post('/api/auth/login')
    .send({ correo: 'admin@prueba.com', contrasena: 'Clave1234' });
  assert.equal(login.status, 200, 'login del administrador');
  tokens.admin = login.body.token;
});

after(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test('flujo completo: de registro a cierre', async () => {
  // 1) Registro público del cliente (nace Cliente/EXTERNO).
  const registro = await request(app).post('/api/auth/registro').send({
    nombres: 'Ana',
    apellidos: 'Gómez',
    tipoDocumento: 'CC',
    numeroDocumento: '1020304050',
    correo: 'cliente@prueba.com',
    telefono: '3001112233',
    contrasena: 'Clave1234',
    confirmarContrasena: 'Clave1234',
  });
  assert.equal(registro.status, 201, 'registro del cliente');
  assert.equal(registro.body.data.tipoUsuario, 'EXTERNO');
  assert.ok(registro.body.token, 'el registro devuelve token');
  tokens.cliente = registro.body.token;

  // 2) El Administrador crea el catálogo (con auditoría).
  const categoria = await request(app)
    .post('/api/catalogo/categorias')
    .set(auth(tokens.admin))
    .send({ nombre: 'Microbiología', descripcion: 'Análisis microbiológicos' });
  assert.equal(categoria.status, 201, 'crear categoría');

  const tipo = await request(app)
    .post('/api/catalogo/tipos-muestra')
    .set(auth(tokens.admin))
    .send({ nombre: 'Agua', descripcion: 'Muestras de agua' });
  assert.equal(tipo.status, 201, 'crear tipo de muestra');

  const examen = await request(app)
    .post('/api/catalogo/examenes')
    .set(auth(tokens.admin))
    .send({
      categoria: categoria.body.data._id,
      tipoMuestra: tipo.body.data._id,
      nombre: 'pH y conductividad',
      precio: 100000,
      tiempoRespuestaDias: 3,
      cantidadRequerida: 500,
      unidadMedida: 'ml',
      tipoEnvase: 'Frasco plástico',
      requiereTemperatura: false,
      activo: true,
    });
  assert.equal(examen.status, 201, 'crear examen');
  ids.examen = examen.body.data._id;

  const auditoria = await request(app).get('/api/configuracion/auditoria').set(auth(tokens.admin));
  assert.equal(auditoria.status, 200);
  assert.ok(
    auditoria.body.data.some((a) => a.entidad === 'Examen' && a.accion === 'Crear'),
    'la creación del examen queda auditada'
  );

  // 3) Pre-solicitud del cliente.
  const solicitud = await request(app)
    .post('/api/solicitudes')
    .set(auth(tokens.cliente))
    .send({
      tipoMuestra: tipo.body.data._id,
      descripcionMuestra: 'Agua de pozo',
      origen: 'Rural',
      cantidadEstimada: '2 litros',
      examenes: [ids.examen],
    });
  assert.equal(solicitud.status, 201, 'crear pre-solicitud');
  ids.solicitud = solicitud.body.data._id;

  // 4) Cotización (el precio lo pone el servidor).
  const cotizacion = await request(app)
    .post('/api/cotizaciones')
    .set(auth(tokens.admin))
    .send({ solicitud: ids.solicitud, examenes: [{ examen: ids.examen, cantidadMuestras: 2 }] });
  assert.equal(cotizacion.status, 201, 'crear cotización');
  assert.equal(cotizacion.body.data.valorTotal, 200000);
  assert.equal(cotizacion.body.data.exonerada, false);
  ids.cotizacion = cotizacion.body.data._id;

  // Snapshot: cambiar el precio del catálogo NO altera la cotización existente.
  await request(app)
    .put(`/api/catalogo/examenes/${ids.examen}`)
    .set(auth(tokens.admin))
    .send({ precio: 999999 });
  const cotizacionLeida = await request(app)
    .get(`/api/cotizaciones/${ids.cotizacion}`)
    .set(auth(tokens.admin));
  assert.equal(cotizacionLeida.body.data.valorTotal, 200000, 'el precio de la cotización es snapshot');

  // 5) Aceptar con firma digital -> emite cupón y pasa a "Pendiente de pago".
  const aceptar = await request(app)
    .post(`/api/cotizaciones/${ids.cotizacion}/aceptar`)
    .set(auth(tokens.cliente))
    .send({
      nombreFirmante: 'Ana Gómez',
      documentoFirmante: '1020304050',
      firmaImagen:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      aceptaTerminos: true,
    });
  assert.equal(aceptar.status, 200, 'aceptar cotización');
  ids.cupon = aceptar.body.cupon?._id;
  assert.ok(ids.cupon, 'se emitió el cupón');

  // 6) Reportar el pago (efectivo, sin comprobante) y verificarlo.
  const pago = await request(app)
    .post('/api/pagos')
    .set(auth(tokens.cliente))
    .send({
      cupon: ids.cupon,
      metodo: 'Efectivo en caja SENA',
      numeroReciboCaja: 'RC-0001',
      fechaPagoReportada: new Date().toISOString(),
      valorReportado: 200000,
    });
  assert.equal(pago.status, 201, 'registrar pago');
  ids.pago = pago.body.data._id;

  const verificar = await request(app)
    .put(`/api/pagos/${ids.pago}/verificar`)
    .set(auth(tokens.admin))
    .send({ aprobar: true });
  assert.equal(verificar.status, 200, 'verificar pago');

  const solicitudPagada = await request(app)
    .get(`/api/solicitudes/${ids.solicitud}`)
    .set(auth(tokens.cliente));
  assert.equal(solicitudPagada.body.data.estado, 'Pagada', 'la solicitud quedó Pagada');

  // 7) Recepción de la muestra (RF-09: exige pago).
  const muestra = await request(app)
    .post('/api/muestras')
    .set(auth(tokens.admin))
    .send({
      solicitud: ids.solicitud,
      entregadoPor: 'Ana Gómez',
      fechaHoraEntrega: new Date().toISOString(),
      cantidadRecibida: 500,
      unidadMedida: 'ml',
      estadoEmpaque: 'Buen estado',
      estadoInicial: 'Aceptada',
    });
  assert.equal(muestra.status, 201, 'recibir muestra');
  ids.muestra = muestra.body.data._id;
  assert.match(muestra.body.data.codigoMuestra, /^A\d-\d{4}-\d{4}$/);

  // 8) Avance de etapas.
  for (const etapaActual of ['Análisis', 'Resultados', 'Validación']) {
    const cambio = await request(app)
      .put(`/api/muestras/${ids.muestra}/cambiar-etapa`)
      .set(auth(tokens.admin))
      .send({ etapaActual });
    assert.equal(cambio.status, 200, `cambiar etapa a ${etapaActual}`);
  }

  // 9) Pregunta de encuesta + informe (subir y aprobar).
  const pregunta = await request(app)
    .post('/api/encuestas/preguntas')
    .set(auth(tokens.admin))
    .send({ texto: 'Calidad de la atención', tipo: 'Calificación', activa: true });
  assert.equal(pregunta.status, 201, 'crear pregunta');
  ids.pregunta = pregunta.body.data._id;

  const informe = await request(app)
    .post('/api/informes')
    .set(auth(tokens.admin))
    .field('muestra', String(ids.muestra))
    .attach('archivoPdf', Buffer.from('%PDF-1.4\n%%EOF'), 'informe.pdf');
  assert.equal(informe.status, 201, 'subir informe');
  assert.equal(informe.body.data.estado, 'En revisión');
  ids.informe = informe.body.data._id;

  const aprobar = await request(app)
    .put(`/api/informes/${ids.informe}/aprobar`)
    .set(auth(tokens.admin));
  assert.equal(aprobar.status, 200, 'aprobar informe');
  assert.equal(aprobar.body.data.estado, 'Aprobado');

  // 10) Encuesta del cliente -> dispara el cierre.
  const encuesta = await request(app)
    .post('/api/encuestas')
    .set(auth(tokens.cliente))
    .send({
      solicitud: ids.solicitud,
      comentario: 'Excelente',
      respuestas: [{ pregunta: ids.pregunta, calificacion: 5 }],
    });
  assert.equal(encuesta.status, 201, 'registrar encuesta');
  assert.equal(encuesta.body.data.completa, true);

  const solicitudCerrada = await request(app)
    .get(`/api/solicitudes/${ids.solicitud}`)
    .set(auth(tokens.cliente));
  assert.equal(solicitudCerrada.body.data.estado, 'Finalizada', 'la solicitud se cerró');
  assert.ok(solicitudCerrada.body.data.fechaCierre, 'la solicitud tiene fechaCierre');

  // 11) Descarga protegida del informe (ya con encuesta completa).
  const pdf = await request(app).get(`/api/informes/${ids.informe}/pdf`).set(auth(tokens.cliente));
  assert.equal(pdf.status, 200, 'descargar informe');
  assert.match(String(pdf.headers['content-type']), /application\/pdf/);

  // 12) Dashboard y reportes (exportaciones).
  const dashboard = await request(app).get('/api/reportes/dashboard').set(auth(tokens.admin));
  assert.equal(dashboard.status, 200);
  assert.ok(dashboard.body.data.muestrasPorEtapa, 'dashboard: muestras por etapa');
  assert.ok(dashboard.body.data.recaudo.total >= 200000, 'dashboard: recaudo');

  const reporteJson = await request(app).get('/api/reportes').set(auth(tokens.admin));
  assert.equal(reporteJson.status, 200);
  assert.ok(reporteJson.body.data.volumenMuestras >= 1, 'reporte: volumen de muestras');
  assert.equal(reporteJson.body.data.facturadoExternos, 200000, 'reporte: facturado a externos');

  const csv = await request(app).get('/api/reportes?formato=csv').set(auth(tokens.admin));
  assert.equal(csv.status, 200);
  assert.match(String(csv.headers['content-type']), /text\/csv/);

  const xlsx = await request(app).get('/api/reportes?formato=xlsx').set(auth(tokens.admin));
  assert.equal(xlsx.status, 200);
  assert.match(
    String(xlsx.headers['content-type']),
    /spreadsheetml/
  );

  const pdfRep = await request(app).get('/api/reportes?formato=pdf').set(auth(tokens.admin));
  assert.equal(pdfRep.status, 200);
  assert.match(String(pdfRep.headers['content-type']), /application\/pdf/);

  // 13) PQR: crear y resolver con fecha.
  const pqr = await request(app)
    .post('/api/inconformidades')
    .set(auth(tokens.cliente))
    .send({ tipo: 'Queja', descripcion: 'Demora en la entrega del informe' });
  assert.equal(pqr.status, 201, 'crear PQR');
  ids.pqr = pqr.body.data._id;

  const enRevision = await request(app)
    .put(`/api/inconformidades/${ids.pqr}`)
    .set(auth(tokens.admin))
    .send({ estado: 'En revisión' });
  assert.equal(enRevision.status, 200, 'PQR -> En revisión');

  const resuelta = await request(app)
    .put(`/api/inconformidades/${ids.pqr}`)
    .set(auth(tokens.admin))
    .send({ estado: 'Resuelta', respuesta: 'Se atendió la demora' });
  assert.equal(resuelta.status, 200, 'PQR -> Resuelta');
  assert.ok(resuelta.body.data.fechaResolucion, 'la PQR resuelta tiene fecha');
});
