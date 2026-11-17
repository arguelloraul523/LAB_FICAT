/**
 * @fileoverview /composables/useConfirmar.js
 * Convierte los diálogos de Quasar (que funcionan con callbacks
 * .onOk/.onCancel) en Promesas, para poder escribir código lineal:
 *
 *   if (await confirmar({ titulo, mensaje })) { ... }
 *   const motivo = await pedirTexto({ titulo, mensaje })
 *
 * Sin este composable, cada pantalla tendría que repetir el $q.dialog completo.
 */
import { useQuasar } from 'quasar'

export function useConfirmar() {
  const $q = useQuasar()

  /**
   * Muestra un diálogo de confirmación.
   * Acepta tanto { mensaje, textoOk } como el alias { texto, confirmar }.
   *
   * @param {Object} opciones
   * @param {string} opciones.titulo
   * @param {string} [opciones.mensaje]
   * @param {string} [opciones.texto]
   * @param {string} [opciones.textoOk]
   * @param {string} [opciones.confirmar]
   * @param {string} [opciones.color='primary']
   * @returns {Promise<boolean>} true si el usuario aceptó
   */
  const confirmar = ({
    titulo,
    mensaje,
    texto,
    textoOk,
    confirmar: labelOk,
    color = 'primary',
  }) =>
    new Promise((resolve) => {
      $q.dialog({
        title: titulo,
        message: mensaje || texto || '',
        ok: { label: textoOk || labelOk || 'Confirmar', color, unelevated: true },
        cancel: { label: 'Cancelar', flat: true, color: 'grey-8' },
        persistent: true,
      })
        .onOk(() => resolve(true))
        .onCancel(() => resolve(false))
    })

  /**
   * Pide un texto al usuario (motivos, observaciones).
   * @param {Object} opciones
   * @param {string} opciones.titulo
   * @param {string} [opciones.mensaje]
   * @param {string} [opciones.texto]
   * @param {string} [opciones.placeholder]
   * @param {string} [opciones.textoOk]
   * @param {string} [opciones.confirmar]
   * @param {string} [opciones.color]
   * @param {boolean} [opciones.obligatorio] - exige texto para cerrar
   * @param {boolean} [opciones.peligro] - botón en rojo
   * @returns {Promise<string|null>} el texto, o null si canceló
   */
  const pedirTexto = ({
    titulo,
    mensaje,
    texto,
    placeholder = '',
    textoOk,
    confirmar: labelOk,
    color,
    obligatorio = false,
    peligro = false,
  }) =>
    new Promise((resolve) => {
      $q.dialog({
        title: titulo,
        message: mensaje || texto || '',
        prompt: {
          model: '',
          type: 'textarea',
          placeholder,
          isValid: (v) => !obligatorio || String(v || '').trim().length > 0,
        },
        ok: {
          label: textoOk || labelOk || 'Guardar',
          color: peligro ? 'negative' : color || 'primary',
          unelevated: true,
        },
        cancel: { label: 'Cancelar', flat: true, color: 'grey-8' },
        persistent: true,
      })
        .onOk((valor) => resolve(String(valor || '').trim()))
        .onCancel(() => resolve(null))
    })

  return { confirmar, pedirTexto }
}
