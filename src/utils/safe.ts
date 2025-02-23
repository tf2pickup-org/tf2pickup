import { logger } from '../logger'

/**
 * Wrap a function in a try/catch block and log any errors.
 * @param fn The function to wrap.
 */
export function safe<Args extends unknown[]>(fn: (...args: Args) => Promise<void>) {
  return (...args: Args) => {
    fn(...args).catch((error: unknown) => {
      logger.error(error)
    })
  }
}
