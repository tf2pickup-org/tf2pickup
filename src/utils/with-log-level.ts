type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// Symbol.for keeps the key stable across modules without a shared import, so
// log-error.ts can read what was tagged here.
const logLevelKey = Symbol.for('tf2pickup.log-level')

/**
 * Tag an error with the level it should be logged at, overriding the default
 * status-code heuristic in `logError`. Returns the same error for chaining,
 * e.g. `throw withLogLevel(errors.badRequest('slot occupied'), 'debug')`.
 */
export function withLogLevel<E>(error: E, level: LogLevel): E {
  if (typeof error === 'object' && error !== null) {
    Object.defineProperty(error, logLevelKey, {
      value: level,
      enumerable: false,
      configurable: true,
    })
  }
  return error
}
