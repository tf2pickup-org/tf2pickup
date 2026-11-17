import { beforeEach, describe, expect, it, vi } from 'vitest'
import { minutesToMilliseconds } from 'date-fns'
import type { SteamId64 } from '../shared/types/steam-id-64'

const get = vi.hoisted(() => vi.fn())
const bySteamId = vi.hoisted(() => vi.fn())
const update = vi.hoisted(() => vi.fn())
const addBan = vi.hoisted(() => vi.fn())

vi.mock('../configuration', () => ({ configuration: { get } }))
vi.mock('../logger', () => ({ logger: { debug: vi.fn(), info: vi.fn() } }))
vi.mock('../players', () => ({ players: { bySteamId, update } }))
vi.mock('../players/add-ban', () => ({ addBan }))

import { applyEscalatingCooldown } from './apply-escalating-cooldown'

const steamId = '76561198074409147' as SteamId64

beforeEach(() => {
  vi.clearAllMocks()
  get.mockResolvedValue([
    { level: 0, banLengthMs: minutesToMilliseconds(30) },
    { level: 1, banLengthMs: minutesToMilliseconds(60) },
  ])
  bySteamId.mockResolvedValue({ steamId, cooldownLevel: 1 })
})

describe('applyEscalatingCooldown()', () => {
  it('bans for the length of the player’s level, with the given reason, and raises the level', async () => {
    await applyEscalatingCooldown(steamId, 'Cancelled a captain draft')
    expect(addBan).toHaveBeenCalledWith(
      expect.objectContaining({
        player: steamId,
        admin: 'bot',
        reason: 'Cancelled a captain draft',
      }),
    )
    const { end } = addBan.mock.calls[0]![0] as { end: Date }
    expect(end.getTime() - Date.now()).toBeGreaterThan(minutesToMilliseconds(59))
    expect(update).toHaveBeenCalledWith(steamId, { $inc: { cooldownLevel: 1 } })
  })

  it('does nothing when no cooldown levels are configured', async () => {
    get.mockResolvedValue([])
    await applyEscalatingCooldown(steamId, 'x')
    expect(addBan).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })
})
