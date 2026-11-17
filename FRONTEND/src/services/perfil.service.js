/**
 * @fileoverview /services/perfil.service.js
 * Llamadas del módulo "Mi cuenta": perfil, parámetros institucionales,
 * tipologías, seguridad, verificación SENA, notificaciones y métricas.
 *
 * Toda la lógica HTTP vive aquí; la vista solo consume estas funciones.
 */
import { get, post, put } from '@/services/api.service'

/** Perfil completo del usuario activo (rol y roles poblados). */
export const cargarPerfil = () => get('/auth/perfil')

/** Parámetros institucionales de LABFICAT (clave/valor). */
export const cargarParametros = () => get('/configuracion/parametros')

/** Tipologías de cliente (RF-04). */
export const cargarTipologias = () => get('/configuracion/tipologias')

/** Cambia la contraseña del usuario activo. */
export const cambiarContrasena = (payload) => put('/auth/cambiar-contrasena', payload)

/** Actualiza los datos propios del perfil (whitelist del servidor). */
export const actualizarPerfil = (payload) => put('/auth/perfil', payload)

/** Actualiza la tipología del usuario activo. */
export const cambiarTipologia = (tipologia) => put('/auth/tipologia', { tipologia })

/** Cambia el rol activo (multirrol). */
export const cambiarRol = (rol) => post('/auth/cambiar-rol', { rol })

/** Envía una solicitud de verificación SENA (multipart con soporte). */
export const enviarVerificacion = (formData) =>
  post('/usuarios/verificaciones', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

/** Notificaciones del usuario activo. */
export const cargarNotificaciones = () => get('/notificaciones')

/** Marca una notificación como leída. */
export const marcarNotificacion = (id) => put(`/notificaciones/${id}`, { leida: true })

/**
 * Métricas del resumen. Cada endpoint se consulta de forma tolerante: si el rol
 * no tiene permiso (403) o no existe (404), esa métrica queda en `null` y la
 * tarjeta correspondiente no se pinta.
 * @returns {Promise<Object>} { solicitudes, muestras, informes, pagos }
 */
export async function cargarMetricas() {
  const [sol, mues, inf, pag] = await Promise.allSettled([
    get('/solicitudes'),
    get('/muestras'),
    get('/informes'),
    get('/pagos/mis-pagos'),
  ])

  const lista = (resultado) =>
    resultado.status === 'fulfilled' ? resultado.value?.data || [] : null

  const solicitudes = lista(sol)
  const muestras = lista(mues)
  const informes = lista(inf)
  const pagos = lista(pag)

  const enCurso = (s) => !['Finalizada', 'Cancelada', 'No aceptada'].includes(s.estado)
  const enTramite = (s) => ['Pre-solicitud', 'Cotizada', 'Pendiente de pago', 'Pagada', 'En proceso'].includes(s.estado)

  return {
    solicitudes:
      solicitudes && {
        total: solicitudes.filter(enCurso).length,
        enTramite: solicitudes.filter(enTramite).length,
      },
    muestras:
      muestras && {
        total: muestras.filter(
          (m) => !['Finalizada', 'Cancelada'].includes(m.etapaActual) && m.estado !== 'Rechazada'
        ).length,
      },
    informes:
      informes && {
        total: informes.filter((i) => i.estado === 'Aprobado').length,
      },
    pagos:
      pagos && {
        aprobados: pagos.filter((p) => p.estado === 'Pagado'),
        total: pagos
          .filter((p) => p.estado === 'Pagado')
          .reduce((acumulado, p) => acumulado + Number(p.valorReportado || 0), 0),
      },
  }
}
