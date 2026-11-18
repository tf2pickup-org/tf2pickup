import { describe, expect, it } from 'vitest'
import { parse } from 'node-html-parser'
import { ObjectId } from 'mongodb'
import type { CaptainPoolModel } from '../../../../database/models/captain-pool.model'
import type { QueueId } from '../../../../database/models/queue.model'
import { QueueState } from '../../../../database/models/queue-state.model'
import { Gamemode } from '../../../../shared/types/gamemode'
import type { SteamId64 } from '../../../../shared/types/steam-id-64'
import { Tf2Team } from '../../../../shared/types/tf2-team'
import { captainRoles } from '../../captain-roles'
import { getDraftView } from '../../get-draft-view'
import { roleKey } from '../../role-key'
import type { PoolView } from '../../types/pool-view'
import { CaptainDraft } from './captain-draft'

const queue = { gamemode: Gamemode.sixes }
const roles = captainRoles(Gamemode.sixes)
const keys = roles.map(roleKey)
const id = (index: number) => `7656119800000${String(index).padStart(4, '0')}` as SteamId64
const members: CaptainPoolModel[] = Array.from({ length: 14 }, (_, index) => ({
  queue: new ObjectId() as QueueId,
  player: { steamId: id(index), name: `p${index}`, avatarUrl: '' },
  roles: keys,
  volunteer: index < 2,
  ready: true,
  locked: true,
  joinedAt: new Date(index),
}))
const draft = {
  queue: new ObjectId() as QueueId,
  token: 't',
  red: id(0),
  blu: id(1),
  picks: [],
  turn: 0,
  turnStartedAt: new Date(),
  turnDeadline: new Date(Date.now() + 10_000),
  startedAt: new Date(),
  mapOptions: [],
  bans: [],
}

function poolView(state: QueueState): PoolView {
  return {
    state,
    members,
    pool: [],
    readiness: {} as never,
    draft: getDraftView(Gamemode.sixes, state, draft, members),
  }
}

describe('CaptainDraft', () => {
  it('shows the captain on the clock a bold status and pickable rows', () => {
    const view = poolView(QueueState.drafting)
    const status = String(CaptainDraft.status({ queue, view, viewer: id(0) }))
    expect(status).toContain('Your pick — pick 1')
    const column = parse(
      String(CaptainDraft.roleColumn({ queue, view, role: roles[5]!, viewer: id(0) })),
    )
    expect(column.querySelectorAll('button')).toHaveLength(12)
    expect(column.querySelector('button')?.getAttribute('aria-label')).toContain('as medic')
    expect(column.querySelector('button')?.hasAttribute('data-pick-button')).toBe(true)
  })

  it('shows everyone else the same pool without buttons', () => {
    const view = poolView(QueueState.drafting)
    const status = String(CaptainDraft.status({ queue, view, viewer: id(5) }))
    expect(status).toContain('(RED) is first picking')
    for (const viewer of [id(1), id(5), undefined]) {
      const column = parse(
        String(CaptainDraft.roleColumn({ queue, view, role: roles[5]!, viewer })),
      )
      expect(column.querySelectorAll('button')).toHaveLength(0)
      expect(column.querySelectorAll('[data-draft-player]')).toHaveLength(12)
    }
  })

  it('never lists the captains in the pool, and numbers the slots in snake order', () => {
    const view = poolView(QueueState.drafting)
    const column = String(
      CaptainDraft.roleColumn({ queue, view, role: roles[5]!, viewer: undefined }),
    )
    expect(column).not.toContain(`data-draft-player="${id(0)}"`)
    const board = parse(String(CaptainDraft.board({ queue, view, viewer: undefined })))
    const teams = board.querySelectorAll('[aria-label$=" team"]')
    const numbers = (team: Tf2Team) =>
      teams[team === Tf2Team.red ? 0 : 1]!.querySelectorAll('[aria-label^="Pick "]').map(slot =>
        slot.getAttribute('aria-label'),
      )
    expect(numbers(Tf2Team.red)).toEqual(['Pick 1', 'Pick 4', 'Pick 5', 'Pick 8', 'Pick 9'])
    expect(numbers(Tf2Team.blu)).toEqual(['Pick 2', 'Pick 3', 'Pick 6', 'Pick 7', 'Pick 10'])
  })

  it('stops offering picks once the maps are being banned', () => {
    const view = poolView(QueueState.banningMaps)
    expect(String(CaptainDraft.status({ queue, view, viewer: id(0) }))).toContain('map bans')
  })

  it('disables its pick buttons while the socket is down', () => {
    const view = poolView(QueueState.drafting)
    const html = parse(String(CaptainDraft({ queue, view, viewer: id(0) })))
    expect(html.querySelector('#captain-draft')?.hasAttribute('data-disable-when-offline')).toBe(
      true,
    )
  })

  it('fades what the captain on the clock cannot pick, and a column with nothing to pick', () => {
    const view = poolView(QueueState.drafting)
    // only 12 of the 14 players can play pocket scout, two of whom are the captains
    const picked = { ...view.draft!, draft: { ...view.draft!.draft } }
    const captainView = {
      ...view,
      draft: { ...picked, legal: picked.legal.filter(pick => pick.role !== roleKey(roles[0]!)) },
    }
    const column = parse(
      String(CaptainDraft.roleColumn({ queue, view: captainView, role: roles[0]!, viewer: id(0) })),
    )
    expect(column.querySelectorAll('button')).toHaveLength(0)
    expect(column.querySelector('[data-role]')?.classList.contains('opacity-40')).toBe(true)
    expect(column.querySelectorAll('[data-draft-player].opacity-40').length).toBeGreaterThan(0)

    const spectator = parse(
      String(CaptainDraft.roleColumn({ queue, view: captainView, role: roles[0]!, viewer: id(5) })),
    )
    expect(spectator.querySelector('[data-role]')?.classList.contains('opacity-40')).toBe(false)
    expect(spectator.querySelectorAll('.opacity-40')).toHaveLength(0)
  })

  it('says when no one is left in a column', () => {
    const view = poolView(QueueState.drafting)
    const empty = { ...view, draft: { ...view.draft!, members: [] } }
    const column = String(
      CaptainDraft.roleColumn({ queue, view: empty, role: roles[5]!, viewer: undefined }),
    )
    expect(column).toContain('No one left')
  })
})
