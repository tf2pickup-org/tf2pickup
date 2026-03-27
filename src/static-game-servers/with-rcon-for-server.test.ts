import { expect, it, vi, describe, beforeEach, afterEach } from 'vitest'
import { withRconForServer } from './with-rcon-for-server'
import type { StaticGameServerModel } from '../database/models/static-game-server.model'
import type { RconCommand } from '../shared/types/rcon-command'

const mockRcon = await vi.hoisted(async () => {
  const { EventEmitter } = await import('node:events')

  class MockRcon extends EventEmitter {
    end = vi.fn()
    send = vi.fn()
    authenticated = true
    connect = vi.fn().mockImplementation(async () => {
      this.authenticated = true
      return this
    })
  }

  return new MockRcon()
})
const mockRconClient = vi.hoisted(() => ({
  Rcon: {
    connect: vi.fn().mockResolvedValue(mockRcon),
  },
}))
vi.mock('rcon-client', () => mockRconClient)

const mockLogger = vi.hoisted(() => ({
  trace: vi.fn(),
  error: vi.fn(),
}))
vi.mock('../logger', () => ({
  logger: mockLogger,
}))

afterEach(() => {
  vi.clearAllMocks()
})

const mockServer = {
  id: 'fake-id',
  name: 'fake-server',
  internalIpAddress: 'FAKE_INTERNAL_IP',
  port: '12345',
  rconPassword: 'FAKE_PASSWORD',
} as StaticGameServerModel

it('should connect using internalIpAddress and coerced port', async () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  await withRconForServer(mockServer, async () => {})
  expect(mockRconClient.Rcon.connect).toHaveBeenCalledWith({
    host: 'FAKE_INTERNAL_IP',
    port: 12345,
    password: 'FAKE_PASSWORD',
    timeout: 30000,
  })
})

it('should execute command', async () => {
  await withRconForServer(mockServer, async ({ rcon }) => {
    await rcon.send('fake_command' as RconCommand)
  })
  expect(mockRcon.send).toHaveBeenCalledWith('fake_command')
})

it('should close the connection', async () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  await withRconForServer(mockServer, async () => {})
  expect(mockRcon.end).toHaveBeenCalled()
})

describe('when an error occurs', () => {
  beforeEach(() => {
    mockRcon.send.mockImplementation(() => {
      mockRcon.emit('error', new Error('FAKE_ERROR'))
    })
  })

  it('should close the connection', async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      await withRconForServer(mockServer, async () => {})
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // empty
    }
    expect(mockRcon.end).toHaveBeenCalled()
  })
})

describe('when the connection is closed', () => {
  beforeEach(() => {
    mockRcon.send.mockImplementation(() => {
      mockRcon.authenticated = false
    })
  })

  it('should reconnect', async () => {
    await withRconForServer(mockServer, async ({ rcon }) => {
      await rcon.send('fake_command' as RconCommand)
    })
    expect(mockRcon.connect).toHaveBeenCalled()
  })
})
