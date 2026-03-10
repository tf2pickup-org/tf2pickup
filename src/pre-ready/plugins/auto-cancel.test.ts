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

vi.mock('../../players/update', () => ({
  update: vi.fn(),
}))

vi.mock('../../utils/safe', () => ({
  safe: <T>(fn: T): T => fn,
}))

vi.mock('../../database/collections', () => ({
  collections: {
    players: {
      find: vi.fn(),
    },
  },
}))

import { events } from '../../events'
import { update } from '../../players/update'
import plugin from './auto-cancel'
import type { GameModel, GameNumber } from '../../database/models/game.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'

const player1 = '76561198000000001' as SteamId64
const player2 = '76561198000000002' as SteamId64

describe('auto-cancel pre-ready up', () => {
  let gameCreatedHandler: (params: { game: GameModel }) => Promise<void>

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.mocked(update).mockResolvedValue({} as never)
    await (plugin as unknown as () => Promise<void>)()
    const call = vi
      .mocked(events.on)
      .mock.calls.find(([event]: [string, ...unknown[]]) => event === 'game:created')
    gameCreatedHandler = call![1] as typeof gameCreatedHandler
  })

  it('emits player/preReady:updated with undefined for each player on game:created', async () => {
    const game = {
      number: 1 as GameNumber,
      slots: [{ player: player1 }, { player: player2 }],
    } as unknown as GameModel

    await gameCreatedHandler({ game })

    expect(events.emit).toHaveBeenCalledWith('player/preReady:updated', {
      steamId: player1,
      preReadyUntil: undefined,
    })
    expect(events.emit).toHaveBeenCalledWith('player/preReady:updated', {
      steamId: player2,
      preReadyUntil: undefined,
    })
  })
})
