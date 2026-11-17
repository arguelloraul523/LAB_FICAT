/**
 * @fileoverview /composables/useNotificar.js
 * Composable = función que empieza por "use" y encapsula lógica reutilizable de
 * la Composition API. Solo se puede llamar DENTRO de <script setup> (o de otro
 * composable), porque usa useQuasar().
 *
 * Centraliza cómo se le avisa al usuario para que todas las pantallas muestren
 * los mensajes igual, con el plugin Notify de Quasar.
 */
import { useQuasar } from 'quasar'

export function useNotificar() {
  const $q = useQuasar()

  /**
   * Mensaje de éxito (verde).
   * @param {string} mensaje - normalmente el `mensaje` que devuelve el backend
   */
  const notificarOk = (mensaje) => {
    $q.notify({ type: 'positive', message: mensaje, icon: 'check_circle' })
  }

  /**
   * Mensaje de error (rojo).
   * Recibe el error YA normalizado por /plugins/axios.js:
   *   { status, mensaje, errores: [] }
   * También acepta un string para los casos que se validan en la vista.
   *
   * @param {{mensaje: string, errores: string[]}|string} error
   * @param {string} [fallback] - texto si el error no trae mensaje útil
   */
  const notificarError = (error, fallback = 'Ocurrió un error inesperado') => {
    if (typeof error === 'string') {
      $q.notify({ type: 'negative', message: error, icon: 'error' })
      return
    }

    const detalle = error?.errores?.length ? error.errores.join(' · ') : ''

    $q.notify({
      type: 'negative',
      icon: 'error',
      message: error?.mensaje || fallback,
      caption: detalle,
      timeout: detalle ? 5000 : 3000,
    })
  }

  /**
   * Aviso informativo (azul).
   * @param {string} mensaje
   */
  const notificarInfo = (mensaje) => {
    $q.notify({ type: 'info', message: mensaje, icon: 'info' })
  }

  /**
   * Aviso de validación: se dispara con `@validation-error` de <q-form> cuando
   * alguna regla de los campos no pasa.
   */
  const validacionFallida = () => {
    $q.notify({
      type: 'negative',
      icon: 'rule',
      message: 'Revisa los campos marcados en rojo',
    })
  }

  return { notificarOk, notificarError, notificarInfo, validacionFallida }
}
