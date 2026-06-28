import { logError } from './log-error'

/**
 * Wrap a function in a try/catch block and log any errors at their appropriate
 * level (see `logError`: 4xx client errors are routine, 5xx are real faults).
 * @param fn The function to wrap.
 */
export function safe<Args extends unknown[]>(fn: (...args: Args) => Promise<void>) {
  return (...args: Args) => {
    fn(...args).catch((error: unknown) => {
      logError(error)
    })
  }
}
