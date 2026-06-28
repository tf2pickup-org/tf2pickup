import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logError } from './log-error'
import { withLogLevel } from './with-log-level'
import { logger } from '../logger'

vi.mock('../logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe('logError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('logs an explicit tag at the requested level', () => {
    const error = withLogLevel(new Error('slot occupied'), 'debug')
    logError(error)
    expect(logger.debug).toHaveBeenCalledWith(error)
    expect(logger.warn).not.toHaveBeenCalled()
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('logs a 404/429 at info', () => {
    const error = Object.assign(new Error('not found'), { statusCode: 404 })
    logError(error)
    expect(logger.info).toHaveBeenCalledWith(error)
  })

  it('logs other 4xx at warn', () => {
    const error = Object.assign(new Error('bad request'), { statusCode: 400 })
    logError(error)
    expect(logger.warn).toHaveBeenCalledWith(error)
  })

  it('logs 5xx at error', () => {
    const error = Object.assign(new Error('boom'), { statusCode: 500 })
    logError(error)
    expect(logger.error).toHaveBeenCalledWith(error)
  })

  it('logs untyped errors at error', () => {
    const error = new Error('boom')
    logError(error)
    expect(logger.error).toHaveBeenCalledWith(error)
  })

  it('prefers the explicit tag over the status code', () => {
    const error = withLogLevel(Object.assign(new Error('boom'), { statusCode: 500 }), 'info')
    logError(error)
    expect(logger.info).toHaveBeenCalledWith(error)
    expect(logger.error).not.toHaveBeenCalled()
  })
})
