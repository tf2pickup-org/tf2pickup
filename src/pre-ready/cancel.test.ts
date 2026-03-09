import { describe, it, expect, vi, beforeEach } from 'vitest'

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

import { players } from '../players'
import { events } from '../events'
import { cancel } from './cancel'
import type { SteamId64 } from '../shared/types/steam-id-64'

const steamId = '76561198000000001' as SteamId64

describe('preReady.cancel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(players.update).mockResolvedValue({} as never)
  })

  it('emits player/preReady:updated with undefined', async () => {
    await cancel(steamId)

    expect(events.emit).toHaveBeenCalledWith('player/preReady:updated', {
      steamId,
      preReadyUntil: undefined,
    })
  })
})
