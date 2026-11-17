import path from 'path';
import { fileURLToPath } from 'url';
import Informe from '../models/Informe.js';
import Muestra from '../models/Muestra.js';
import { transicionValida } from '../constants/estados.js';
import { encuestaCompleta, intentarCerrarSolicitud } from './cierre.service.js';

// ============================================================
// Informes de resultados (RF-25).
// El Administrador (Jefe de Laboratorio) sube el PDF validado y lo
// aprueba. El PDF se guarda en GridFS (ver routes/informe.routes.js) y
// solo sale por GET /informes/:id/pdf, con propiedad y encuesta completa
// (RF-26). La constante CARPETA_INFORMES se conserva solo por compatibilidad
// con las verificaciones offline (no se usa para servir el archivo).
// ============================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CARPETA_INFORMES = path.join(__dirname, '..', '..', 'uploads', 'informes');

const errorCon = (statusCode, mensaje) => {
  const err = new Error(mensaje);
  err.statusCode = statusCode;
  return err;
};

// Sube el informe: nace "En revisión" y sin revisor (lo fija el servidor).
// `body.archivoPdf` es el id GridFS que dejó la ruta (guardarSubida).
const crearInforme = async ({ body }) => {
  if (!body?.archivoPdf) {
    throw errorCon(400, 'El archivo PDF del informe es obligatorio');
  }
  return Informe.create({
    muestra: body.muestra,
    archivoPdf: body.archivoPdf,
    estado: 'En revisión',
    revisadoPor: null,
    fechaValidacion: null,
  });
};

// Aprueba el informe (solo Administrador): En revisión -> Aprobado.
// Fija revisor y fecha, y dispara el intento de cierre de la solicitud.
const aprobarInforme = async ({ id, usuario }) => {
  const informe = await Informe.findById(id);
  if (!informe) throw errorCon(404, 'Registro no encontrado');

  if (!transicionValida('informe', informe.estado, 'Aprobado')) {
    throw errorCon(409, `Transición inválida de "estado": ${informe.estado} → Aprobado`);
  }

  informe.estado = 'Aprobado';
  informe.revisadoPor = usuario._id;
  informe.fechaValidacion = new Date();
  informe.fechaEnvio = new Date();
  await informe.save();

  const muestra = await Muestra.findById(informe.muestra).select('solicitud codigoMuestra');
  if (muestra) await intentarCerrarSolicitud(muestra.solicitud);

  return informe;
};

// Prepara la descarga autenticada: exige informe Aprobado y encuesta
// completa. Si la encuesta no está lista, 403 con código ENCUESTA_PENDIENTE.
// Devuelve el id GridFS (`archivoPdf`) y el nombre para el Content-Disposition;
// el controlador hace el stream desde GridFS.
const prepararDescarga = async (id) => {
  const informe = await Informe.findById(id).populate({
    path: 'muestra',
    select: 'solicitud codigoMuestra',
  });
  if (!informe) throw errorCon(404, 'Registro no encontrado');

  if (informe.estado !== 'Aprobado') {
    throw errorCon(409, 'El informe aún no ha sido aprobado por el laboratorio');
  }

  const solicitudId = informe.muestra?.solicitud;
  const completa = solicitudId ? await encuestaCompleta(solicitudId) : false;
  if (!completa) {
    const err = errorCon(403, 'Debes completar la encuesta de satisfacción para descargar el informe');
    err.codigo = 'ENCUESTA_PENDIENTE';
    throw err;
  }

  const codigo = informe.muestra?.codigoMuestra || informe._id;
  return { archivoPdf: informe.archivoPdf, nombre: `informe-${codigo}.pdf` };
};

export { crearInforme, aprobarInforme, prepararDescarga, CARPETA_INFORMES };
