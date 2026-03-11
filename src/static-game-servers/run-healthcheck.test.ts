import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { StaticGameServerModel } from '../database/models/static-game-server.model'

// Mock withRconForServer
const mockWithRconForServer = vi.hoisted(() => vi.fn())
vi.mock('./with-rcon-for-server', () => ({
  withRconForServer: mockWithRconForServer,
}))

// Mock events
const mockEvents = vi.hoisted(() => ({
  on: vi.fn(),
  off: vi.fn(),
}))
vi.mock('../events', () => ({ events: mockEvents }))

// Mock store
const mockUpdatePhase = vi.hoisted(() => vi.fn())
const mockCompleteCheck = vi.hoisted(() => vi.fn())
const mockGetCheck = vi.hoisted(() =>
  vi.fn().mockReturnValue({ phases: { rconConnect: { status: 'running' } } }),
)
vi.mock('./healthcheck-store', () => ({
  updatePhase: mockUpdatePhase,
  completeCheck: mockCompleteCheck,
  getCheck: mockGetCheck,
}))

// Mock environment
vi.mock('../environment', () => ({
  environment: {
    LOG_RELAY_ADDRESS: '1.2.3.4',
    LOG_RELAY_PORT: 12345,
  },
}))

// Mock nanoid — return predictable values
let nanoidCallCount = 0
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => {
    nanoidCallCount++
    return `fake-id-${nanoidCallCount}`
  }),
}))

import { runHealthcheck } from './run-healthcheck'

const mockServer = {
  id: 'server-1',
  name: 'test-server',
  internalIpAddress: '10.0.0.1',
  port: '27015',
  rconPassword: 'secret',
} as StaticGameServerModel

beforeEach(() => {
  vi.clearAllMocks()
  nanoidCallCount = 0
})

describe('when RCON connection fails', () => {
  beforeEach(() => {
    mockWithRconForServer.mockRejectedValue(new Error('ECONNREFUSED'))
  })

  it('sets rconConnect to running then fail', async () => {
    await runHealthcheck(mockServer, 'check-1')
    expect(mockUpdatePhase).toHaveBeenCalledWith('check-1', 'rconConnect', { status: 'running' })
    expect(mockUpdatePhase).toHaveBeenCalledWith('check-1', 'rconConnect', {
      status: 'fail',
      message: 'ECONNREFUSED',
    })
  })

  it('completes the check', async () => {
    await runHealthcheck(mockServer, 'check-1')
    expect(mockCompleteCheck).toHaveBeenCalledWith('check-1')
  })
})

describe('when RCON command fails', () => {
  beforeEach(() => {
    mockWithRconForServer.mockImplementation(
      async (_server: unknown, callback: (args: { rcon: { send: ReturnType<typeof vi.fn> } }) => Promise<void>) => {
        const mockRcon = {
          send: vi.fn().mockRejectedValue(new Error('command failed')),
        }
        await callback({ rcon: mockRcon })
    })
  })

  it('sets rconConnect to ok, rconCommand to fail', async () => {
    await runHealthcheck(mockServer, 'check-1')
    expect(mockUpdatePhase).toHaveBeenCalledWith('check-1', 'rconConnect', { status: 'ok' })
    expect(mockUpdatePhase).toHaveBeenCalledWith('check-1', 'rconCommand', { status: 'running' })
    expect(mockUpdatePhase).toHaveBeenCalledWith('check-1', 'rconCommand', {
      status: 'fail',
      message: 'command failed',
    })
  })

  it('completes the check', async () => {
    await runHealthcheck(mockServer, 'check-1')
    expect(mockCompleteCheck).toHaveBeenCalledWith('check-1')
  })
})

describe('when log round-trip succeeds', () => {
  beforeEach(() => {
    mockWithRconForServer.mockImplementation(async (_server: unknown, callback: Function) => {
      const mockRcon = {
        send: vi.fn().mockResolvedValue(''),
      }
      // Simulate log arriving: fire the handler after events.on is called
      mockEvents.on.mockImplementation((_event: string, handler: Function) => {
        setImmediate(() => {
          // fake-id-1 is logSecret (first nanoid call), fake-id-2 is probe (second)
          handler({ message: { password: 'fake-id-1', payload: 'say "fake-id-2"' } })
        })
      })
      await callback({ rcon: mockRcon })
    })
  })

  it('sets logRoundTrip to ok with timing message', async () => {
    await runHealthcheck(mockServer, 'check-1')
    expect(mockUpdatePhase).toHaveBeenCalledWith('check-1', 'logRoundTrip', {
      status: 'ok',
      message: expect.stringMatching(/^received in \d+ms$/),
    })
  })

  it('removes the event listener', async () => {
    await runHealthcheck(mockServer, 'check-1')
    expect(mockEvents.off).toHaveBeenCalledWith('gamelog:message', expect.any(Function))
  })

  it('completes the check', async () => {
    await runHealthcheck(mockServer, 'check-1')
    expect(mockCompleteCheck).toHaveBeenCalledWith('check-1')
  })
})

describe('when log round-trip times out', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockWithRconForServer.mockImplementation(async (_server: unknown, callback: Function) => {
      const mockRcon = { send: vi.fn().mockResolvedValue('') }
      mockEvents.on.mockImplementation(() => {})
      const callbackPromise = callback({ rcon: mockRcon })
      // Use advanceTimersByTimeAsync so pending microtasks (the awaited rcon.send
      // calls inside the callback) flush before the setTimeout fires, ensuring
      // the timeout Promise is registered before the timer advances.
      await vi.advanceTimersByTimeAsync(11000)
      await callbackPromise
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('sets logRoundTrip to fail', async () => {
    await runHealthcheck(mockServer, 'check-1')
    expect(mockUpdatePhase).toHaveBeenCalledWith('check-1', 'logRoundTrip', {
      status: 'fail',
      message: 'no log received within 10s',
    })
  })

  it('removes the event listener on timeout', async () => {
    await runHealthcheck(mockServer, 'check-1')
    expect(mockEvents.off).toHaveBeenCalledWith('gamelog:message', expect.any(Function))
  })

  it('completes the check', async () => {
    await runHealthcheck(mockServer, 'check-1')
    expect(mockCompleteCheck).toHaveBeenCalledWith('check-1')
  })
})
