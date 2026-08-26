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
import type { SteamId64 } from '../../shared/types/steam-id-64'

const replacee = '76561198000000001' as SteamId64

describe('free-players', () => {
  let freePlayerTask: (params: { player: SteamId64 }) => Promise<void>

  beforeEach(async () => {
    vi.resetAllMocks()
    vi.mocked(players.update).mockResolvedValue({} as never)
    await (plugin as unknown as () => Promise<void>)()
    freePlayerTask = vi
      .mocked(tasks.register)
      .mock.calls.find(
        ([name]: [string, ...unknown[]]) => name === 'games.freePlayer',
      )![1] as typeof freePlayerTask
  })

  it('emits player/activeGame:updated with undefined when freePlayer task runs', async () => {
    await freePlayerTask({ player: replacee })

    expect(events.emit).toHaveBeenCalledWith('player/activeGame:updated', {
      steamId: replacee,
      activeGame: undefined,
    })
  })
})
