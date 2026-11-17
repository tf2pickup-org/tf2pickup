import { FlashMessage } from '../html/components/flash-message'
import { logError } from '../utils/log-error'
import { measureTime } from '../utils/measure-time'
import type { AppWebSocket } from '../websocket/types'
import { queueWsCallDuration } from './metrics'

export function wsSafe<Args extends unknown[]>(
  operation: string,
  fn: (socket: AppWebSocket, ...args: Args) => Promise<void>,
) {
  return (socket: AppWebSocket, ...args: Args) => {
    measureTime(
      async () => {
        await fn(socket, ...args)
      },
      ({ ms, result }) => {
        queueWsCallDuration.record(ms, {
          operation,
          result,
        })
      },
    ).catch(async (error: unknown) => {
      // Same levelling as the HTTP error handler (src/main.ts): client errors
      // (4xx) — queue races ('slot occupied'), invalid state, unauthorized —
      // are routine and not logged at error level. See logError.
      logError(error)
      if (error instanceof Error) {
        const msg = await FlashMessage({
          message: `Error: ${error.message}`,
          type: 'error',
        })
        socket.send(msg)
      }
    })
  }
}
