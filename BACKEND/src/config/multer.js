import multer from 'multer';

// ============================================================
// Subida de archivos (JPG/PNG/PDF, máx. 5 MB).
// Los archivos se cargan en MEMORIA (buffer) y se guardan en GridFS
// desde las rutas vía `services/storage.service.js`. Así los binarios
// persisten en MongoDB Atlas y sobreviven a los deploys de Render
// (el filesystem de Render es efímero).
// ============================================================

// Solo se permiten imágenes y PDF (por extensión).
const fileFilter = (req, file, cb) => {
  const permitidos = /jpeg|jpg|png|pdf/;
  const ok = permitidos.test((file.originalname || '').toLowerCase());
  if (ok) cb(null, true);
  else cb(new Error('Formato no permitido (solo JPG, PNG o PDF)'));
};

// Crea una instancia de multer en memoria. El parámetro `subcarpeta` se
// conserva por compatibilidad con las rutas (solo documenta el origen lógico).
const crearUpload = () =>
  multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // máx. 5 MB
  });

const upload = crearUpload();

export { crearUpload, fileFilter };
export default upload;
