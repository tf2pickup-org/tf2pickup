import { expect, it, vi, describe, beforeEach } from 'vitest'
import { withRcon } from './with-rcon'
import type { GameModel } from '../../database/models/game.model'

const mockRcon = await vi.hoisted(async () => {
  const { EventEmitter } = await import('node:events')

  class MockRcon extends EventEmitter {
    end = vi.fn()
    send = vi.fn()
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
vi.mock('../../logger', () => ({
  logger: mockLogger,
}))

const mockGame = {
  gameServer: {
    rcon: {
      address: 'FAKE_ADDRESS',
      port: '12345',
      password: 'FAKE_PASSWORD',
    },
  },
} as GameModel

it('should connect', async () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  await withRcon(mockGame, async () => {})
  expect(mockRconClient.Rcon.connect).toHaveBeenCalledWith({
    host: 'FAKE_ADDRESS',
    port: 12345,
    password: 'FAKE_PASSWORD',
    timeout: 30000,
  })
})

it('should execute command', async () => {
  await withRcon(mockGame, async ({ rcon }) => {
    await rcon.send('fake_command')
  })
  expect(mockRcon.send).toHaveBeenCalledWith('fake_command')
})

it('should close the connection', async () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  await withRcon(mockGame, async () => {})
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
      await withRcon(mockGame, async () => {})
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // empty
    }
    expect(mockRcon.end).toHaveBeenCalled()
  })
})
