import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { milliseconds, minutesToMilliseconds } from 'date-fns'
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
const cooldownLevels = [
  { level: 0, banLengthMs: minutesToMilliseconds(30) },
  { level: 1, banLengthMs: minutesToMilliseconds(60) },
]

function mockConfiguration(decayPeriodMs: number) {
  get.mockImplementation((key: string) =>
    Promise.resolve((key === 'games.cooldown_levels' ? cooldownLevels : decayPeriodMs) as never),
  )
}

function banLength(addBanCall: unknown) {
  const { end } = addBanCall as { end: Date }
  return end.getTime() - Date.now()
}

describe('applyEscalatingCooldown()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    mockConfiguration(milliseconds({ months: 1 }))
    bySteamId.mockResolvedValue({ steamId, cooldownLevel: 1 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('bans for the length of the player’s level, with the given reason, and raises the level', async () => {
    await applyEscalatingCooldown(steamId, 'Cancelled a captain draft')
    expect(addBan).toHaveBeenCalledWith(
      expect.objectContaining({
        player: steamId,
        admin: 'bot',
        reason: 'Cancelled a captain draft',
      }),
    )
    expect(banLength(addBan.mock.calls[0]![0])).toBeGreaterThan(minutesToMilliseconds(59))
    const updateDoc = update.mock.calls[0]![1] as { $set: { cooldownLevel: number } }
    expect(updateDoc.$set.cooldownLevel).toBe(2)
  })

  it('records when the level changed so it can decay later', async () => {
    await applyEscalatingCooldown(steamId, 'x')
    const updateDoc = update.mock.calls[0]![1] as { $set: { cooldownLevelUpdatedAt: Date } }
    expect(updateDoc.$set.cooldownLevelUpdatedAt).toBeInstanceOf(Date)
  })

  it('decays the stored level before applying the cooldown', async () => {
    const decayPeriodMs = milliseconds({ months: 1 })
    mockConfiguration(decayPeriodMs)
    bySteamId.mockResolvedValue({
      steamId,
      cooldownLevel: 3,
      cooldownLevelUpdatedAt: new Date(Date.now() - 2 * decayPeriodMs),
    })

    await applyEscalatingCooldown(steamId, 'x')

    // decayed from 3 to 1, so the ban is for level 1 and the level is raised from the decayed one
    expect(banLength(addBan.mock.calls[0]![0])).toBe(minutesToMilliseconds(60))
    const updateDoc = update.mock.calls[0]![1] as { $set: { cooldownLevel: number } }
    expect(updateDoc.$set.cooldownLevel).toBe(2)
  })

  it('never decays below zero', async () => {
    mockConfiguration(milliseconds({ days: 1 }))
    bySteamId.mockResolvedValue({
      steamId,
      cooldownLevel: 1,
      cooldownLevelUpdatedAt: new Date(Date.now() - milliseconds({ years: 1 })),
    })

    await applyEscalatingCooldown(steamId, 'x')

    expect(banLength(addBan.mock.calls[0]![0])).toBe(minutesToMilliseconds(30))
    const updateDoc = update.mock.calls[0]![1] as { $set: { cooldownLevel: number } }
    expect(updateDoc.$set.cooldownLevel).toBe(1)
  })

  it('does not decay when the decay period is zero', async () => {
    mockConfiguration(0)
    bySteamId.mockResolvedValue({
      steamId,
      cooldownLevel: 5,
      cooldownLevelUpdatedAt: new Date(Date.now() - milliseconds({ years: 1 })),
    })

    await applyEscalatingCooldown(steamId, 'x')

    const updateDoc = update.mock.calls[0]![1] as { $set: { cooldownLevel: number } }
    expect(updateDoc.$set.cooldownLevel).toBe(6)
  })

  it('does nothing when no cooldown levels are configured', async () => {
    get.mockResolvedValue([])
    await applyEscalatingCooldown(steamId, 'x')
    expect(addBan).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })
})
