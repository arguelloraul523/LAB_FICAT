// ============================================================
// Conexión a MongoDB Atlas.
// Único lugar que abre/cierra la sesión de Mongoose.
// ============================================================
import mongoose from 'mongoose';


const conectarDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Falta la variable de entorno MONGODB_URI en el archivo .env');
  }

  const conn = await mongoose.connect(uri, {
    // Falla rápido si Atlas no responde (el default de Mongoose es esperar 30 s).
    serverSelectionTimeoutMS: 5000,
  });
  // El log imprime el host REAL al que se conectó: así nunca se confunde Atlas
  // con un mongod local (error detectado en una copia desactualizada del proyecto).
  console.log(`✅ Conexión a MongoDB Atlas exitosa (${conn.connection.host})`);

  // Atlas puede desconectar/reconectar: queda informado en consola.
  // Mongoose reintenta solo; estos listeners solo son informativos.
  mongoose.connection.on('disconnected', () => console.warn('⚠️ MongoDB desconectado'));
  mongoose.connection.on('reconnected', () => console.log('🔄 MongoDB reconectado'));
};

const desconectarDB = async () => {
  await mongoose.disconnect();
};

export { conectarDB, desconectarDB };


