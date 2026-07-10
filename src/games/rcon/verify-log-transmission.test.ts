import { afterEach, expect, it, vi } from 'vitest'
import { verifyLogTransmission } from './verify-log-transmission'
import { events } from '../../events'
import type { GameNumber } from '../../database/models/game.model'
import type { RconCommand } from '../../shared/types/rcon-command'

vi.mock('../../environment', () => ({
  environment: {
    LOG_RELAY_ADDRESS: 'FAKE_LOG_RELAY_ADDRESS',
    LOG_RELAY_PORT: 9871,
  },
}))

vi.mock('../../logger', () => ({
  logger: {
    trace: vi.fn(),
    debug: vi.fn(),
  },
}))

const gameNumber = 512 as GameNumber

afterEach(() => {
  vi.useRealTimers()
})

it('should resolve when a log message with the matching logsecret arrives', async () => {
  const rcon = {
    send: vi.fn().mockImplementation(async (command: RconCommand) => {
      if (command.startsWith('echo')) {
        setImmediate(() => {
          events.emit('gamelog:message', {
            message: { payload: 'rcon from "127.0.0.1:51234": command "echo"', password: 'SECRET' },
          })
        })
      }
      return ''
    }),
  }

  await verifyLogTransmission({ rcon, logSecret: 'SECRET', gameNumber })
  expect(rcon.send).toHaveBeenCalledWith('log on')
  expect(events.listenerCount('gamelog:message')).toBe(0)
})

it('should throw when no log message arrives', async () => {
  vi.useFakeTimers()
  const rcon = { send: vi.fn().mockResolvedValue('') }

  const promise = verifyLogTransmission({ rcon, logSecret: 'SECRET', gameNumber })
  const assertion = expect(promise).rejects.toThrow(/game server is not sending logs/)
  await vi.advanceTimersByTimeAsync(5000)
  await assertion
  expect(events.listenerCount('gamelog:message')).toBe(0)
})

it('should ignore log messages with a different logsecret', async () => {
  vi.useFakeTimers()
  const rcon = {
    send: vi.fn().mockImplementation(async (command: RconCommand) => {
      if (command.startsWith('echo')) {
        setImmediate(() => {
          events.emit('gamelog:message', {
            message: { payload: 'rcon from "127.0.0.1:51234": command "echo"', password: 'OTHER' },
          })
        })
      }
      return ''
    }),
  }

  const promise = verifyLogTransmission({ rcon, logSecret: 'SECRET', gameNumber })
  const assertion = expect(promise).rejects.toThrow(/game server is not sending logs/)
  await vi.advanceTimersByTimeAsync(5000)
  await assertion
})

it('should throw when the signal is aborted', async () => {
  const rcon = { send: vi.fn().mockResolvedValue('') }
  const controller = new AbortController()
  controller.abort('FAKE_REASON')

  await expect(
    verifyLogTransmission({ rcon, logSecret: 'SECRET', gameNumber, signal: controller.signal }),
  ).rejects.toThrow('FAKE_REASON')
})
