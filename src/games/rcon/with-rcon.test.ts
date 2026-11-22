import { EventEmitter } from 'node:events'
import { secondsToMilliseconds } from 'date-fns'
import { expect, it, vi, beforeEach } from 'vitest'
import { withRcon } from './with-rcon'
import type { GameModel, GameNumber } from '../../database/models/game.model'

const mockConnect = vi.hoisted(() => vi.fn())
vi.mock('rcon-client', () => ({ Rcon: { connect: mockConnect } }))

const mockLogger = vi.hoisted(() => ({
  trace: vi.fn(),
  error: vi.fn(),
}))
vi.mock('../../logger', () => ({
  logger: mockLogger,
}))

class MockRcon extends EventEmitter<{ disconnect: [error: Error | undefined] }> {
  end = vi.fn(async () => {
    this.emit('disconnect', undefined)
  })
  send = vi.fn<(command: string) => Promise<string>>().mockResolvedValue('server status')
}

let mockRcon: MockRcon
const mockGame = {
  number: 42 as GameNumber,
  gameServer: {
    rcon: {
      address: 'FAKE_ADDRESS',
      port: '12345',
      password: 'FAKE_PASSWORD',
    },
  },
} as GameModel

beforeEach(() => {
  vi.clearAllMocks()
  mockRcon = new MockRcon()
  mockConnect.mockResolvedValue(mockRcon)
})

it('connects with the game server credentials', async () => {
  await withRcon(mockGame, async ({ rcon }) => await rcon.send('status'))

  expect(mockConnect).toHaveBeenCalledWith({
    host: 'FAKE_ADDRESS',
    port: 12345,
    password: 'FAKE_PASSWORD',
    timeout: secondsToMilliseconds(30),
    connectTimeout: secondsToMilliseconds(30),
  })
})

it('returns the command response and closes the connection', async () => {
  const response = await withRcon(mockGame, async ({ rcon }) => await rcon.send('status'))

  expect(mockRcon.send).toHaveBeenCalledWith('status')
  expect(response).toBe('server status')
  expect(mockRcon.end).toHaveBeenCalledOnce()
  expect(mockLogger.error.mock.calls).toHaveLength(0)
})

it('logs disconnect errors and closes the connection after a failed command', async () => {
  const error = new Error('Connection lost')
  mockRcon.send.mockImplementationOnce(async () => {
    mockRcon.emit('disconnect', error)
    throw error
  })

  await expect(withRcon(mockGame, async ({ rcon }) => await rcon.send('status'))).rejects.toBe(
    error,
  )

  expect(mockRcon.send).toHaveBeenCalledOnce()
  expect(mockLogger.error).toHaveBeenCalledExactlyOnceWith(error, 'game #42: rcon error')
  expect(mockRcon.end).toHaveBeenCalledOnce()
})
