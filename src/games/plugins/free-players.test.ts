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

vi.mock('../../tasks', () => ({
  tasks: {
    register: vi.fn(),
    schedule: vi.fn(),
  },
}))

vi.mock('../../configuration', () => ({
  configuration: {
    get: vi.fn(),
  },
}))

import { events } from '../../events'
import { players } from '../../players'
import { tasks } from '../../tasks'
import plugin from './free-players'
import type { GameModel, GameNumber } from '../../database/models/game.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'

const replacee = '76561198000000001' as SteamId64
const replacement = '76561198000000002' as SteamId64
const gameNumber = 7 as GameNumber

describe('free-players', () => {
  let freePlayerTask: (params: { player: SteamId64 }) => Promise<void>
  let playerReplacedHandler: (params: {
    game: GameModel
    replacee: SteamId64
    replacement: SteamId64
  }) => Promise<void>

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.mocked(players.update).mockResolvedValue({} as never)
    await (plugin as unknown as () => Promise<void>)()
    freePlayerTask = vi
      .mocked(tasks.register)
      .mock.calls.find(
        ([name]: [string, ...unknown[]]) => name === 'games.freePlayer',
      )![1] as typeof freePlayerTask
    const call = vi
      .mocked(events.on)
      .mock.calls.find(([event]: [string, ...unknown[]]) => event === 'game:playerReplaced')
    playerReplacedHandler = call![1] as typeof playerReplacedHandler
  })

  it('emits player/activeGame:updated with undefined when freePlayer task runs', async () => {
    await freePlayerTask({ player: replacee })

    expect(events.emit).toHaveBeenCalledWith('player/activeGame:updated', {
      steamId: replacee,
      activeGame: undefined,
    })
  })

  it('emits player/activeGame:updated for replacement and replacee on game:playerReplaced', async () => {
    const game = { number: gameNumber } as GameModel

    await playerReplacedHandler({ game, replacee, replacement })

    expect(events.emit).toHaveBeenCalledWith('player/activeGame:updated', {
      steamId: replacement,
      activeGame: gameNumber,
    })
    expect(events.emit).toHaveBeenCalledWith('player/activeGame:updated', {
      steamId: replacee,
      activeGame: undefined,
    })
  })
})
