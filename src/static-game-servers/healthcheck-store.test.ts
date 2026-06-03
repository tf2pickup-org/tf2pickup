import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { minutesToMilliseconds } from 'date-fns'
import {
  createCheck,
  getCheck,
  getActiveCheckId,
  updatePhase,
  completeCheck,
  _resetForTesting,
} from './healthcheck-store'

beforeEach(() => {
  vi.useFakeTimers()
  _resetForTesting()
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('createCheck', () => {
  it('returns a checkId string', () => {
    const checkId = createCheck('server-1')
    expect(typeof checkId).toBe('string')
    expect(checkId.length).toBeGreaterThan(0)
  })

  it('inserts a pending result', () => {
    const checkId = createCheck('server-1')
    const result = getCheck(checkId)
    expect(result).toEqual({
      serverId: 'server-1',
      status: 'running',
      phases: {
        rconConnect: { status: 'pending' },
        rconCommand: { status: 'pending' },
        logRoundTrip: { status: 'pending' },
      },
    })
  })

  it('records the active check for the server', () => {
    const checkId = createCheck('server-1')
    expect(getActiveCheckId('server-1')).toBe(checkId)
  })

  it('auto-deletes result after 5 minutes', () => {
    const checkId = createCheck('server-1')
    vi.advanceTimersByTime(minutesToMilliseconds(5))
    expect(getCheck(checkId)).toBeUndefined()
    expect(getActiveCheckId('server-1')).toBeUndefined()
  })
})

describe('updatePhase', () => {
  it('updates the specified phase status', () => {
    const checkId = createCheck('server-1')
    updatePhase(checkId, 'rconConnect', { status: 'running' })
    expect(getCheck(checkId)?.phases.rconConnect).toEqual({ status: 'running' })
  })

  it('is a no-op for unknown checkId', () => {
    expect(() => updatePhase('nonexistent', 'rconConnect', { status: 'ok' })).not.toThrow()
  })
})

describe('completeCheck', () => {
  it('sets status to done', () => {
    const checkId = createCheck('server-1')
    completeCheck(checkId)
    expect(getCheck(checkId)?.status).toBe('done')
  })

  it('removes the server from activeChecks', () => {
    const checkId = createCheck('server-1')
    completeCheck(checkId)
    expect(getActiveCheckId('server-1')).toBeUndefined()
  })
})
