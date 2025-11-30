import { EventEmitter } from 'node:events'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GameEventType,
  type GameEventModel,
  type GameCreated,
} from '../../database/models/game-event.model'
import {
  GameServerProvider,
  GameState,
  type GameModel,
} from '../../database/models/game.model'
import { withRcon, __resetRconConnectionCacheForTestsOnly } from './with-rcon'

type TestRcon = ReturnType<typeof createTestRcon>

function createTestRcon() {
  const emitter = new EventEmitter() as EventEmitter & {
    send: ReturnType<typeof vi.fn>
    end: ReturnType<typeof vi.fn>
  }

  emitter.send = vi.fn(async () => 'ok')
  emitter.end = vi.fn(async () => {
    emitter.emit('end')
  })

  return emitter
}

const { createdRcons, connectMock } = vi.hoisted(() => {
  const createdRcons: TestRcon[] = []
  const connectMock = vi.fn(async () => {
    const instance = createTestRcon()
    createdRcons.push(instance)
    return instance
  })

  return { createdRcons, connectMock }
})

vi.mock('rcon-client', () => ({
  Rcon: {
    connect: connectMock,
  },
}))

function createGame(overrides?: Partial<GameModel>): GameModel {
  const events: [GameCreated, ...GameEventModel[]] = [
    {
      event: GameEventType.gameCreated,
      at: new Date(),
    },
  ]

  const defaultGameServer: NonNullable<GameModel['gameServer']> = {
    id: 'srv-1',
    provider: GameServerProvider.static,
    name: 'Test server',
    address: '127.0.0.1',
    port: '27015',
    rcon: {
      address: '127.0.0.1',
      port: '27015',
      password: 'secret',
    },
  }

  const base: GameModel = {
    number: 1 as GameModel['number'],
    map: 'cp_badlands',
    state: GameState.created,
    slots: [],
    events,
    gameServer: defaultGameServer,
  }

  return {
    ...base,
    ...overrides,
    gameServer: overrides?.gameServer ?? defaultGameServer,
  }
}

function getCachedRconInstance() {
  if (createdRcons.length === 0) {
    throw new Error('No RCON connection created')
  }
  return createdRcons.at(-1)!
}

describe('withRcon', () => {
  beforeEach(() => {
    createdRcons.length = 0
    connectMock.mockClear()
    vi.useRealTimers()
    __resetRconConnectionCacheForTestsOnly()
  })

  it('reuses an existing connection for the same server', async () => {
    const game = createGame()

    await withRcon(game, async ({ rcon }) => {
      await rcon.send('status')
    })

    await withRcon(game, async ({ rcon }) => {
      await rcon.send('status')
    })

    expect(connectMock).toHaveBeenCalledTimes(1)
  })

  it('closes idle connections after 30 minutes without commands', async () => {
    vi.useFakeTimers()
    const game = createGame()

    await withRcon(game, async ({ rcon }) => {
      await rcon.send('status')
    })

    const cached = getCachedRconInstance()
    expect(cached.end).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(30 * 60 * 1000)
    expect(cached.end).toHaveBeenCalledTimes(1)

    await withRcon(game, async ({ rcon }) => {
      await rcon.send('status')
    })

    expect(connectMock).toHaveBeenCalledTimes(2)
  })

  it('drops cached connection when the server closes the socket', async () => {
    const game = createGame()
    await withRcon(game, async ({ rcon }) => {
      await rcon.send('status')
    })

    const cached = getCachedRconInstance()
    cached.emit('end')

    await withRcon(game, async ({ rcon }) => {
      await rcon.send('status')
    })

    expect(connectMock).toHaveBeenCalledTimes(2)
  })
})
