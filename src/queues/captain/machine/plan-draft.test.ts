import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../logger', () => ({ logger: { info: vi.fn(), error: vi.fn() } }))
vi.mock('../metrics', () => ({ captainDraftMetrics: { decisions: { add: vi.fn() } } }))

import { secondsToMilliseconds } from 'date-fns'
import { ObjectId } from 'mongodb'
import type { CaptainDraftModel } from '../../../database/models/captain-draft.model'
import type { CaptainPoolModel } from '../../../database/models/captain-pool.model'
import type { QueueId, QueueModel } from '../../../database/models/queue.model'
import { Gamemode } from '../../../shared/types/gamemode'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { Tf2Team } from '../../../shared/types/tf2-team'
import { applyPick } from '../apply-pick'
import { captainRoles } from '../captain-roles'
import { getDraftPosition } from '../get-draft-position'
import { legalPicks } from '../legal-picks'
import { roleKey } from '../role-key'
import { planDraft } from './plan-draft'

const queueId = new ObjectId() as QueueId
const pickTimeout = secondsToMilliseconds(10)
const settings = (maps: string[] = ['cp_a', 'cp_b', 'cp_c']) =>
  ({
    gamemode: Gamemode.sixes,
    pickTimeout,
    maps: maps.map(name => ({ name })),
  }) as Pick<QueueModel, 'gamemode' | 'pickTimeout' | 'maps'>
const roles = captainRoles(Gamemode.sixes).map(roleKey)
const steamId = (index: number) => `7656119800000${String(index).padStart(4, '0')}` as SteamId64

// two players per role, the first two volunteering
function pool(): CaptainPoolModel[] {
  return Array.from({ length: 2 * roles.length }, (_, index) => ({
    queue: queueId,
    player: { steamId: steamId(index), name: `p${index}`, avatarUrl: '' },
    roles: [roles[index % roles.length]!],
    volunteer: index < 2,
    ready: true,
    locked: true,
    joinedAt: new Date(index),
  }))
}

function draft(overrides: Partial<CaptainDraftModel> = {}): CaptainDraftModel {
  const startedAt = new Date(0)
  return {
    queue: queueId,
    token: new ObjectId().toHexString(),
    red: steamId(0),
    blu: steamId(1),
    picks: [],
    turn: 0,
    turnStartedAt: startedAt,
    turnDeadline: new Date(pickTimeout),
    startedAt,
    mapOptions: [],
    bans: [],
    ...overrides,
  }
}

const now = new Date(secondsToMilliseconds(100))
// past the last turn, a draft's picks are only counted
const picked = () =>
  Array.from({ length: 10 }, () => ({
    team: Tf2Team.red,
    player: steamId(2),
    role: roles[0]!,
    at: now,
    how: 'chosen' as const,
  }))

describe('planDraft()', () => {
  it('starts the first turn and waits for a choice', () => {
    const subject = draft()
    expect(planDraft(settings(), subject, pool(), now)).toEqual({
      phase: 'pick',
      turnChanged: true,
    })
    expect(subject.turnStartedAt).toEqual(now)
    expect(subject.turnDeadline).toEqual(new Date(now.getTime() + pickTimeout))
  })

  it('keeps the clock of a turn that is still on', () => {
    const subject = draft({
      turn: 1,
      picks: [{ team: Tf2Team.red, player: steamId(2), role: roles[0]!, at: now, how: 'chosen' }],
    })
    expect(planDraft(settings(), subject, pool(), now)).toEqual({
      phase: 'pick',
      turnChanged: false,
    })
    expect(subject.turnStartedAt).toEqual(new Date(0))
  })

  it('plays the picks out, forcing the last one, then draws the maps for the bans', () => {
    const subject = draft()
    let plan = planDraft(settings(), subject, pool(), now)
    while (plan.phase === 'pick') {
      const position = getDraftPosition(captainRoles(Gamemode.sixes), subject, pool())
      applyPick(subject, legalPicks(position)[0]!, 'chosen')
      plan = planDraft(settings(), subject, pool(), now)
    }
    expect(plan).toEqual({ phase: 'ban', first: true })
    expect(subject.picks).toHaveLength(10)
    expect(subject.picks.at(-1)!.how).toBe('forced')
    expect([...subject.mapOptions].sort()).toEqual(['cp_a', 'cp_b', 'cp_c'])
    expect(subject.turn).toBe(0)
    expect(subject.turnStartedAt).toEqual(now)
  })

  it('fails a draft whose map pool has nothing to offer', () => {
    expect(planDraft(settings([]), draft({ picks: picked() }), pool(), now)).toEqual({
      phase: 'noMaps',
    })
  })

  it('launches straight away when a single map is eligible', () => {
    expect(planDraft(settings(['cp_a']), draft({ picks: picked() }), pool(), now)).toEqual({
      phase: 'launch',
    })
  })

  it.each([
    [1, { phase: 'ban', first: false }],
    [2, { phase: 'launch' }],
  ])('after %i ban(s) of three maps → %o', (bans, plan) => {
    const subject = draft({
      picks: picked(),
      mapOptions: ['cp_a', 'cp_b', 'cp_c'],
      bans: ['cp_a', 'cp_b'].slice(0, bans).map(map => ({
        team: Tf2Team.blu,
        map,
        at: now,
        how: 'chosen' as const,
      })),
    })
    expect(planDraft(settings(), subject, pool(), now)).toEqual(plan)
    expect(subject.turn).toBe(bans)
    expect(subject.mapOptions).toEqual(['cp_a', 'cp_b', 'cp_c'])
  })
})
