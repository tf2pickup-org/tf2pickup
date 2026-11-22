import { describe, expect, it, vi } from 'vitest'
import { parse, type HTMLParser, type HTMLElement } from 'node-html-parser'
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
import type { CaptainRole } from '../../types/captain-role'
import type { PoolView } from '../../types/pool-view'
import { CaptainDraft } from './captain-draft'

vi.mock('../../../../html/components/map-thumbnail', () => ({ MapThumbnail: () => <div></div> }))

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

// the whole frame, since that is what a draft update swaps in
const frame = (view: PoolView, viewer?: SteamId64): HTMLParser =>
  parse(String(CaptainDraft({ queue, view, viewer })))

const statusOf = (draftFrame: HTMLParser) => draftFrame.querySelector('#captain-draft-status')!.text
const columnOf = (draftFrame: HTMLParser, role: CaptainRole): HTMLElement =>
  draftFrame.querySelector(`#captain-draft-role-${role.gameClass}-${role.name}`)!

describe('CaptainDraft', () => {
  it('shows the captain on the clock a bold status and pickable rows', () => {
    const view = frame(poolView(QueueState.drafting), id(0))
    expect(statusOf(view)).toContain('Your pick — pick 1')
    const medic = columnOf(view, roles[5]!)
    expect(medic.querySelectorAll('button')).toHaveLength(12)
    expect(medic.querySelector('button')?.getAttribute('aria-label')).toContain('as medic')
    expect(medic.querySelector('button')?.hasAttribute('data-pick-button')).toBe(true)
  })

  it('shows everyone else the same pool without buttons', () => {
    const view = poolView(QueueState.drafting)
    expect(statusOf(frame(view, id(5)))).toContain('(RED) is first picking')
    for (const viewer of [id(1), id(5), undefined]) {
      const medic = columnOf(frame(view, viewer), roles[5]!)
      expect(medic.querySelectorAll('button')).toHaveLength(0)
      expect(medic.querySelectorAll('[data-draft-player]')).toHaveLength(12)
    }
  })

  it('never lists the captains in the pool, and numbers the slots in snake order', () => {
    const view = frame(poolView(QueueState.drafting))
    const medic = columnOf(view, roles[5]!)
    expect(medic.querySelector(`[data-draft-player="${id(0)}"]`)).toBeNull()
    expect(medic.querySelector(`[data-draft-player="${id(1)}"]`)).toBeNull()
    const board = view.querySelector('#captain-draft-board')!
    const teams = board.querySelectorAll('[aria-label$=" team"]')
    const numbers = (team: Tf2Team) =>
      teams[team === Tf2Team.red ? 0 : 1]!.querySelectorAll('[aria-label^="Pick "]').map(slot =>
        slot.getAttribute('aria-label'),
      )
    expect(numbers(Tf2Team.red)).toEqual(['Pick 1', 'Pick 4', 'Pick 5', 'Pick 8', 'Pick 9'])
    expect(numbers(Tf2Team.blu)).toEqual(['Pick 2', 'Pick 3', 'Pick 6', 'Pick 7', 'Pick 10'])
  })

  it('stops offering picks once the maps are being banned', () => {
    expect(statusOf(frame(poolView(QueueState.banningMaps), id(0)))).toContain('bans map 1')
  })

  it('disables its pick buttons while the socket is down', () => {
    const view = frame(poolView(QueueState.drafting), id(0))
    const draftFrame = view.querySelector('#captain-draft')
    expect(draftFrame?.hasAttribute('data-disable-when-offline')).toBe(true)
  })

  it('fades what the captain on the clock cannot pick, and a column with nothing to pick', () => {
    const view = poolView(QueueState.drafting)
    // only 12 of the 14 players can play pocket scout, two of whom are the captains
    const picked = { ...view.draft!, draft: { ...view.draft!.draft } }
    const captainView = {
      ...view,
      draft: { ...picked, legal: picked.legal.filter(pick => pick.role !== roleKey(roles[0]!)) },
    }
    const scout = columnOf(frame(captainView, id(0)), roles[0]!)
    expect(scout.querySelectorAll('button')).toHaveLength(0)
    expect(scout.classList.contains('opacity-40')).toBe(true)
    expect(scout.querySelectorAll('[data-draft-player].opacity-40').length).toBeGreaterThan(0)

    const spectator = columnOf(frame(captainView, id(5)), roles[0]!)
    expect(spectator.classList.contains('opacity-40')).toBe(false)
    expect(spectator.querySelectorAll('.opacity-40')).toHaveLength(0)
  })

  it('says when no one is left in a column', () => {
    const view = poolView(QueueState.drafting)
    const empty = { ...view, draft: { ...view.draft!, members: [] } }
    expect(columnOf(frame(empty), roles[5]!).text).toContain('No one left')
  })
})
