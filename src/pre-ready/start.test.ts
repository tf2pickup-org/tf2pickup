import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../configuration', () => ({
  configuration: {
    get: vi.fn(),
  },
}))

vi.mock('../logger', () => ({
  logger: { trace: vi.fn() },
}))

vi.mock('../players', () => ({
  players: {
    update: vi.fn(),
  },
}))

vi.mock('../events', () => ({
  events: {
    emit: vi.fn(),
  },
}))

import { configuration } from '../configuration'
import { players } from '../players'
import { events } from '../events'
import { start } from './start'
import type { SteamId64 } from '../shared/types/steam-id-64'

const steamId = '76561198000000001' as SteamId64

describe('preReady.start', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(players.update).mockResolvedValue({} as never)
  })

  it('emits player/preReady:updated with a Date when timeout is positive', async () => {
    vi.mocked(configuration.get).mockResolvedValue(30_000)

    await start(steamId)

    expect(events.emit).toHaveBeenCalledWith('player/preReady:updated', {
      steamId,
      preReadyUntil: expect.any(Date),
    })
  })

  it('does not emit player/preReady:updated when timeout is zero', async () => {
    vi.mocked(configuration.get).mockResolvedValue(0)

    await start(steamId)

    expect(events.emit).not.toHaveBeenCalled()
  })
})
