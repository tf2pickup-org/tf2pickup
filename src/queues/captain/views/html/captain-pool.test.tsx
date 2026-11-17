import { describe, expect, it } from 'vitest'
import { parse } from 'node-html-parser'
import { ObjectId } from 'mongodb'
import type { CaptainPoolModel } from '../../../../database/models/captain-pool.model'
import type { QueueId } from '../../../../database/models/queue.model'
import { QueueState } from '../../../../database/models/queue-state.model'
import { Gamemode } from '../../../../shared/types/gamemode'
import type { SteamId64 } from '../../../../shared/types/steam-id-64'
import type { PoolView } from '../../types/pool-view'
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

  it('hides every checkbox from a viewer locked into the draft', () => {
    const html = parse(String(CaptainPool({ queue, view: view([member(true)]), actor })))
    expect(html.querySelectorAll('input[type=checkbox]')).toHaveLength(0)
  })
})
