import { logger } from '../logger'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// Mirror of the key set by withLogLevel; kept in sync via the global registry.
const logLevelKey = Symbol.for('tf2pickup.log-level')

/**
 * Log an error at the appropriate level. An explicit tag from `withLogLevel`
 * always wins. Otherwise client errors (4xx) are routine — unknown players,
 * aborted games, queue races, validation — and logged at warn, with 404s/429s
 * demoted further to info; server faults (5xx) and untyped errors are errors.
 */
export function logError(error: unknown): void {
  switch (resolveLevel(error)) {
    case 'debug':
      logger.debug(error)
      break
    case 'info':
      logger.info(error)
      break
    case 'warn':
      logger.warn(error)
      break
    case 'error':
      logger.error(error)
      break
  }
}

function resolveLevel(error: unknown): LogLevel {
  if (typeof error === 'object' && error !== null) {
    const tagged = (error as Record<symbol, unknown>)[logLevelKey]
    if (tagged === 'debug' || tagged === 'info' || tagged === 'warn' || tagged === 'error') {
      return tagged
    }
    if ('statusCode' in error) {
      const { statusCode } = error
      if (typeof statusCode === 'number' && statusCode < 500) {
        return statusCode === 404 || statusCode === 429 ? 'info' : 'warn'
      }
    }
  }
  return 'error'
}
