import crudConAuditoria from '../utils/crudConAuditoria.js';
import Rol from '../models/Rol.js';
import Modulo from '../models/Modulo.js';

// Roles (con los módulos asociados) y Módulos del sistema, con auditoría (RF-31)
const roles = crudConAuditoria(Rol, { entidad: 'Rol', populate: ['modulos'] });
const modulos = crudConAuditoria(Modulo, { entidad: 'Modulo' });

export { roles, modulos };
