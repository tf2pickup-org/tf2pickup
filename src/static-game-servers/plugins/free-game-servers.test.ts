import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'events'
import { GameServerProvider, GameState } from '../../database/models/game.model'
import type { GameModel } from '../../database/models/game.model'

const emitter = new EventEmitter()

vi.mock('../../events', () => ({
  events: {
    on: (event: string, handler: (...args: unknown[]) => void) => emitter.on(event, handler),
  },
}))

vi.mock('../update', () => ({
  update: vi.fn(),
}))

vi.mock('../../tasks', () => ({
  tasks: {
    register: vi.fn(),
    schedule: vi.fn(),
  },
}))

vi.mock('../../logger', () => ({
  logger: { error: vi.fn() },
}))

import freeGameServers from './free-game-servers'
import { update } from '../update'

function makeGame(gameServer?: Partial<GameModel['gameServer']>): GameModel {
  return {
    number: 6862,
    state: GameState.started,
    ...(gameServer && { gameServer }),
  } as GameModel
}

function emit(event: string, params: unknown): Promise<void> {
  emitter.emit(event, params)
  return new Promise(resolve => setImmediate(resolve))
}

describe('free game servers on reassignment', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    emitter.removeAllListeners()
    await freeGameServers(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as any,
      {},
    )
  })

  it('frees the old static server when the game is reassigned to another server', async () => {
    await emit('game:updated', {
      before: makeGame({ provider: GameServerProvider.static, id: 'srv-8', name: '#8' }),
      after: makeGame({ provider: GameServerProvider.servemeTf, id: 'srv-x', name: 'serveme' }),
    })
    expect(update).toHaveBeenCalledWith({ id: 'srv-8', game: 6862 }, { $unset: { game: 1 } })
  })

  it('does nothing when the game server did not change', async () => {
    const gameServer = { provider: GameServerProvider.static, id: 'srv-8', name: '#8' }
    await emit('game:updated', {
      before: makeGame(gameServer),
      after: makeGame(gameServer),
    })
    expect(update).not.toHaveBeenCalled()
  })

  it('does nothing when the previous server was not static', async () => {
    await emit('game:updated', {
      before: makeGame({ provider: GameServerProvider.servemeTf, id: 'srv-x', name: 'serveme' }),
      after: makeGame({ provider: GameServerProvider.static, id: 'srv-8', name: '#8' }),
    })
    expect(update).not.toHaveBeenCalled()
  })

  it('does nothing on the initial assignment', async () => {
    await emit('game:updated', {
      before: makeGame(),
      after: makeGame({ provider: GameServerProvider.static, id: 'srv-8', name: '#8' }),
    })
    expect(update).not.toHaveBeenCalled()
  })

  it('does not throw when the old server is already freed', async () => {
    vi.mocked(update).mockRejectedValue(new Error('not found'))
    await emit('game:updated', {
      before: makeGame({ provider: GameServerProvider.static, id: 'srv-8', name: '#8' }),
      after: makeGame({ provider: GameServerProvider.static, id: 'srv-6', name: '#6' }),
    })
    expect(update).toHaveBeenCalled()
  })
})
