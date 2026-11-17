// ============================================================
// Autorización por secreto compartido para los disparos externos del
// cron (Render Cron Jobs / cron-job.org). No usa JWT porque el disparador
// externo no tiene sesión de usuario.
//
// Uso:  POST /api/cron/retrasos   con header  x-cron-secret: <CRON_SECRET>
// ============================================================
const autorizarCron = (req, res, next) => {
  const secreto = process.env.CRON_SECRET;
  const enviado = req.headers['x-cron-secret'];
  if (!secreto || !enviado || enviado !== secreto) {
    return res.status(401).json({ ok: false, mensaje: 'Secreto de cron inválido' });
  }
  next();
};

export { autorizarCron };
