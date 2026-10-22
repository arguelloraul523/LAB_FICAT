import express from 'express';
const router = express.Router();
import { roles } from '../controllers/rol.controller.js';
import { proteger, autorizar } from '../middlewares/auth.middleware.js';
import { validarRol } from '../validators/rol.validators.js';
import validarCampos from '../validators/index.js';

// Roles del sistema (solo administradores pueden modificar)
router.get('/', proteger, roles.listar);
router.get('/:id', proteger, roles.obtener);
router.post('/', proteger, autorizar('Administrador'), validarRol, validarCampos, roles.crear);
router.put('/:id', proteger, autorizar('Administrador'), validarRol, validarCampos, roles.actualizar);
router.delete('/:id', proteger, autorizar('Administrador'), roles.eliminar);

export default router;
