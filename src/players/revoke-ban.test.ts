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
    bans.push({ actor: admin, start: banStart, end: new Date(), reason: 'x' })
  })

  it('ends the ban and marks mirrored ETF2L bans in a single update', async () => {
    await revokeBan({ player: 'player' as never, banStart, actor: admin })
    expect(update).toHaveBeenCalledExactlyOnceWith(
      'player',
      {
        $set: {
          'bans.$[ban].end': expect.any(Date),
          'bans.$[mirrored].revokedLocally': true,
        },
      },
      {
        arrayFilters: [
          { 'ban.start': { $eq: banStart } },
          { 'mirrored.start': { $eq: banStart }, 'mirrored.source': 'etf2l' },
        ],
      },
    )
  })
})
