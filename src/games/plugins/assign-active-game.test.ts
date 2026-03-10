import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fastify-plugin', () => ({
  default: <T>(fn: T): T => fn,
}))

vi.mock('../../events', () => ({
  events: {
    on: vi.fn(),
    emit: vi.fn(),
  },
}))

vi.mock('../../players', () => ({
  players: {
    update: vi.fn(),
  },
}))

vi.mock('../../utils/safe', () => ({
  safe: <T>(fn: T): T => fn,
}))

import { events } from '../../events'
import { players } from '../../players'
import plugin from './assign-active-game'
import type { GameModel, GameNumber } from '../../database/models/game.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'

const player1 = '76561198000000001' as SteamId64
const player2 = '76561198000000002' as SteamId64
const gameNumber = 5 as GameNumber

describe('assign-active-game', () => {
  let gameCreatedHandler: (params: { game: GameModel }) => Promise<void>

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.mocked(players.update).mockResolvedValue({} as never)
    await (plugin as unknown as () => Promise<void>)()
    const call = vi
      .mocked(events.on)
      .mock.calls.find(([event]: [string, ...unknown[]]) => event === 'game:created')
    gameCreatedHandler = call![1] as typeof gameCreatedHandler
  })

  it('emits player/activeGame:updated for each slot player when a game is created', async () => {
    const game = {
      number: gameNumber,
      slots: [{ player: player1 }, { player: player2 }],
    } as unknown as GameModel

    await gameCreatedHandler({ game })

    expect(events.emit).toHaveBeenCalledWith('player/activeGame:updated', {
      steamId: player1,
      activeGame: gameNumber,
    })
    expect(events.emit).toHaveBeenCalledWith('player/activeGame:updated', {
      steamId: player2,
      activeGame: gameNumber,
    })
  })
})
