import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PlayerBan } from '../database/models/player.model'

const { bans, update } = vi.hoisted(() => {
  const bans: PlayerBan[] = []
  return { bans, update: vi.fn(async () => ({ steamId: 'player', bans })) }
})

vi.mock('./update', () => ({ update }))
vi.mock('../events', () => ({ events: { emit: vi.fn() } }))
vi.mock('../activity-log', () => ({ activityLog: { record: vi.fn() } }))

import { revokeBan } from './revoke-ban'

const banStart = new Date('2026-01-01')
const admin = '76561198074409147' as never

describe('revokeBan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    bans.length = 0
  })

  it('marks a mirrored ETF2L ban as revoked locally', async () => {
    bans.push({ actor: 'bot', start: banStart, end: new Date(), reason: 'x', source: 'etf2l' })
    const ban = await revokeBan({ player: 'player' as never, banStart, actor: admin })
    expect(ban.revokedLocally).toBe(true)
    expect(update).toHaveBeenLastCalledWith(
      'player',
      { $set: { 'bans.$[ban].revokedLocally': true } },
      { arrayFilters: [{ 'ban.start': { $eq: banStart }, 'ban.source': 'etf2l' }] },
    )
  })

  it('does not mark a normal ban', async () => {
    bans.push({ actor: admin, start: banStart, end: new Date(), reason: 'x' })
    const ban = await revokeBan({ player: 'player' as never, banStart, actor: admin })
    expect(ban.revokedLocally).toBeUndefined()
    expect(update).toHaveBeenCalledOnce()
  })
})
