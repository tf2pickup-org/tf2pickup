import { describe, expect, it } from 'vitest'
import { parse } from 'node-html-parser'
import { ObjectId } from 'mongodb'
import type { CaptainPoolModel } from '../../../../database/models/captain-pool.model'
import type { QueueId } from '../../../../database/models/queue.model'
import { QueueState } from '../../../../database/models/queue-state.model'
import { Gamemode } from '../../../../shared/types/gamemode'
import type { SteamId64 } from '../../../../shared/types/steam-id-64'
import type { PoolView } from '../../types/pool-view'
import { captainRoles } from '../../captain-roles'
import { CaptainPool } from './captain-pool'

const steamId = '76561198000000001' as SteamId64
const queue = {
  enabled: true,
  skillThreshold: null,
  requireVerification: false,
  gamemode: Gamemode.sixes,
}
const actor = {
  steamId,
  hasAcceptedRules: true,
  bans: [],
  verified: true,
  skill: undefined,
} as never

function member(locked: boolean): CaptainPoolModel {
  return {
    queue: new ObjectId() as QueueId,
    player: { steamId, name: 'a', avatarUrl: '' },
    roles: ['medic:medic'],
    volunteer: false,
    ready: false,
    locked,
    joinedAt: new Date(),
  }
}

function view(members: CaptainPoolModel[]): PoolView {
  return {
    state: QueueState.drafting,
    members,
    pool: members.filter(({ locked }) => !locked),
    readiness: {
      full: false,
      players: 0,
      requiredPlayers: 12,
      coveredRoles: 0,
      volunteers: 0,
      missing: [],
      bottleneck: 'missing: x',
    },
  }
}

describe('CaptainPool', () => {
  it('shows a free viewer the sign-up checkboxes', () => {
    const html = parse(String(CaptainPool({ queue, view: view([]), actor })))
    expect(html.querySelectorAll('input[type=checkbox]').length).toBeGreaterThan(6)
  })

  it('labels the volunteer toggle once', () => {
    const html = parse(String(CaptainPool({ queue, view: view([member(false)]), actor })))
    expect(html.querySelectorAll('[aria-label="Volunteer as captain"]')).toHaveLength(1)
  })

  it('hides every checkbox from a viewer locked into the draft', () => {
    const html = parse(String(CaptainPool({ queue, view: view([member(true)]), actor })))
    expect(html.querySelectorAll('input[type=checkbox]')).toHaveLength(0)
  })

  it('shows a readied player green in every signed-up column with no competing background', () => {
    const ready = { ...member(false), roles: ['medic:medic', 'demoman:demoman'], ready: true }
    const model = { ...view([ready]), state: QueueState.ready }
    const html = parse(String(CaptainPool({ queue, view: model, actor })))
    const rows = html.querySelectorAll(`[data-player="${steamId}"]`)
    expect(rows).toHaveLength(2)
    for (const row of rows) {
      expect(row.classNames).toContain('bg-emerald-900')
      expect(row.classNames).not.toContain('bg-zinc-800')
      expect(row.classNames).toContain('text-zinc-100')
    }
    expect(html.querySelectorAll('input[disabled]')).toHaveLength(0)
  })

  it('outlines my unready row during ready-up', () => {
    const model = { ...view([member(false)]), state: QueueState.ready }
    const html = parse(String(CaptainPool({ queue, view: model, actor })))
    expect(html.querySelector(`[data-player="${steamId}"]`)?.classNames).toContain(
      'outline-zinc-500',
    )
  })

  it('keeps every live fragment of a 40-player all-role 9v9 pool under 50KB', () => {
    const roles = captainRoles(Gamemode.highlander).map(role => `${role.gameClass}:${role.name}`)
    const members = Array.from({ length: 40 }, (_, index) => ({
      ...member(false),
      player: {
        steamId: `7656119800000${String(index).padStart(4, '0')}` as SteamId64,
        name: `a-rather-long-player-name-${index}`,
        avatarUrl: '',
      },
      roles,
      volunteer: true,
    }))
    const props = { queue: { ...queue, gamemode: Gamemode.highlander }, view: view(members) }
    const fragments = [
      CaptainPool.volunteers(props),
      CaptainPool.bottleneck(props),
      ...captainRoles(Gamemode.highlander).map(role => CaptainPool.roleColumn({ ...props, role })),
    ].map(fragment => Buffer.byteLength(String(fragment)))

    expect(Math.max(...fragments)).toBeLessThan(50 * 1024)
  })
})
