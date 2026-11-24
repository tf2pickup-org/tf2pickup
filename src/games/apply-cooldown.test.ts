import { beforeEach, describe, expect, it, vi } from 'vitest'
import { minutesToMilliseconds } from 'date-fns'
import type { GameNumber } from '../database/models/game.model'
import type { SteamId64 } from '../shared/types/steam-id-64'

const mockConfigurationGet = vi.hoisted(() => vi.fn())
const mockBySteamId = vi.hoisted(() => vi.fn())
const mockPlayersUpdate = vi.hoisted(() => vi.fn())
const mockAddBan = vi.hoisted(() => vi.fn())

vi.mock('../configuration', () => ({ configuration: { get: mockConfigurationGet } }))
vi.mock('../logger', () => ({ logger: { trace: vi.fn(), debug: vi.fn(), info: vi.fn() } }))
vi.mock('../players', () => ({
  players: { bySteamId: mockBySteamId, update: mockPlayersUpdate },
}))
vi.mock('../players/restrictions/add', () => ({
  add: (_kind: string, props: unknown) => mockAddBan(props),
}))

import { applyCooldown } from './apply-cooldown'

const steamId = '76561198074409147' as SteamId64

describe('applyCooldown()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfigurationGet.mockResolvedValue([{ level: 0, banLengthMs: minutesToMilliseconds(30) }])
    mockBySteamId.mockResolvedValue({ steamId, cooldownLevel: 0 })
  })

  it('bans the player with a reason naming the game they failed to join', async () => {
    await applyCooldown(steamId, 18 as GameNumber)

    expect(mockAddBan).toHaveBeenCalledWith(
      expect.objectContaining({
        player: steamId,
        actor: 'bot',
        reason: 'Not connecting to game #18 in time',
      }),
    )
  })
})
