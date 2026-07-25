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

vi.mock('../../utils/safe', () => ({
  safe: <T>(fn: T): T => fn,
}))

vi.mock('../../tasks', () => ({
  tasks: {
    register: vi.fn(),
  },
}))

vi.mock('../cancel', () => ({
  cancel: vi.fn(),
}))

import { events } from '../../events'
import { tasks } from '../../tasks'
import { cancel } from '../cancel'
import plugin from './auto-cancel'
import type { GameModel, GameNumber } from '../../database/models/game.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'

const player1 = '76561198000000001' as SteamId64
const player2 = '76561198000000002' as SteamId64

describe('auto-cancel pre-ready up', () => {
  let gameCreatedHandler: (params: { game: GameModel }) => Promise<void>

  beforeEach(async () => {
    vi.resetAllMocks()
    await (plugin as unknown as () => Promise<void>)()
    const call = vi
      .mocked(events.on)
      .mock.calls.find(([event]: [string, ...unknown[]]) => event === 'game:created')
    gameCreatedHandler = call![1] as typeof gameCreatedHandler
  })

  it('cancels the pre-ready when the scheduled expiry fires', async () => {
    const [name, handler] = vi.mocked(tasks.register).mock.calls[0]!

    expect(name).toBe('preReady:cancel')
    await handler({ player: player1 })

    expect(cancel).toHaveBeenCalledWith(player1)
  })

  it('cancels the pre-ready of every player on game:created', async () => {
    const game = {
      number: 1 as GameNumber,
      slots: [{ player: player1 }, { player: player2 }],
    } as unknown as GameModel

    await gameCreatedHandler({ game })

    expect(cancel).toHaveBeenCalledWith(player1)
    expect(cancel).toHaveBeenCalledWith(player2)
  })
})
