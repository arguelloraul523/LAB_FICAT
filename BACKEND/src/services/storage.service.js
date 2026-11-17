import mongoose from 'mongoose';
import path from 'path';

// ============================================================
// Almacenamiento persistente de archivos con GridFS (MongoDB Atlas).
//
// Motivo: el filesystem de Render/Heroku es EFÍMERO; los archivos
// guardados en `uploads/` se pierden en cada despliegue. GridFS guarda
// los binarios dentro de MongoDB (Atlas), que sí persiste.
//
// API:
//   guardar(buffer, nombre) -> id (string)      sube un buffer
//   abrirLectura(id)         -> Readable stream  descarga por id
//   existe(id)               -> boolean
//   eliminar(id)             -> Promise
//   guardarSubida(campo, prefijo) -> middleware que guarda req.file.buffer
// ============================================================

const BUCKET = 'uploads';

// Instancia de GridFSBucket sobre la conexión activa.
const obtenerBucket = () =>
  new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET });

// Guarda un Buffer y devuelve el id del archivo (ObjectId como string).
const guardar = (buffer, nombreArchivo = 'archivo') =>
  new Promise((resolve, reject) => {
    if (!buffer || !buffer.length) return reject(new Error('No hay contenido para guardar'));
    const stream = obtenerBucket().openUploadStream(nombreArchivo);
    stream.on('error', reject);
    stream.on('finish', () => resolve(String(stream.id)));
    stream.end(buffer);
  });

// Devuelve un stream de lectura para descargar el archivo por su id.
const abrirLectura = (id) =>
  obtenerBucket().openDownloadStream(new mongoose.Types.ObjectId(String(id)));

// ¿Existe el archivo en GridFS?
const existe = async (id) => {
  try {
    const docs = await obtenerBucket()
      .find({ _id: new mongoose.Types.ObjectId(String(id)) })
      .limit(1)
      .toArray();
    return docs.length > 0;
  } catch {
    return false;
  }
};

// Elimina un archivo por id.
const eliminar = (id) => obtenerBucket().delete(new mongoose.Types.ObjectId(String(id)));

// Middleware: si llega un `req.file` (multer en memoria), lo guarda en GridFS
// y deja el id en `req.body[campo]`. El `prefijo` solo organiza el nombre lógico.
const guardarSubida = (campo, prefijo = '') => async (req, res, next) => {
  try {
    if (req.file && req.file.buffer) {
      const ext = path.extname(req.file.originalname || '').toLowerCase();
      const nombre = `${prefijo ? `${prefijo}/` : ''}${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      req.body[campo] = await guardar(req.file.buffer, nombre);
    }
    next();
  } catch (err) {
    next(err);
  }
};

export { guardar, abrirLectura, existe, eliminar, guardarSubida, BUCKET };
