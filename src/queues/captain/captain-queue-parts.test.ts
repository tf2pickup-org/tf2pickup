import { describe, it, expect, beforeEach, vi } from 'vitest'
import { parse } from 'node-html-parser'
import { ObjectId } from 'mongodb'
import type { CaptainPoolModel } from '../../database/models/captain-pool.model'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { Gamemode } from '../../shared/types/gamemode'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { QueueParts } from '../page/queue-parts'
import { captainRoles } from './captain-roles'
import { getDraftView } from './get-draft-view'
import { roleKey } from './role-key'
import type { PoolView } from './types/pool-view'

// the pool view is whatever the test set up, the rest of the page is stubbed to its target element
const poolView = vi.hoisted(() => ({ view: undefined as PoolView | undefined }))

vi.mock('./get-pool-view', () => ({
  getPoolView: () => Promise.resolve(poolView.view),
}))
vi.mock('../views/html/set-title', () => ({ SetTitle: () => '<title id="set-title"></title>' }))
vi.mock('../player-counts', () => ({ playerCounts: () => Promise.resolve({ current: 4 }) }))
vi.mock('../views/html/is-in-queue', () => ({ IsInQueue: () => '<div id="is-in-queue"></div>' }))
vi.mock('../views/html/queue-switcher', () => ({
  QueueSwitcher: () => '<div id="queue-switcher"></div>',
}))
vi.mock('./views/html/captain-pool', () => ({
  CaptainPool: Object.assign(() => '<form id="captain-pool"></form>', {
    volunteers: () => '<div id="captain-volunteers"></div>',
    bottleneck: () => '<div id="captain-bottleneck"></div>',
    roleColumn: (props: { role: { gameClass: string; name: string } }) =>
      `<div id="captain-pool-role-${props.role.gameClass}-${props.role.name}"></div>`,
  }),
}))
vi.mock('./views/html/captain-counters', () => ({
  CaptainCounters: () => '<h1 id="captain-counters"></h1>',
}))
vi.mock('./views/html/captain-ready-status', () => ({
  CaptainReadyStatus: () => '<div id="captain-ready-status"></div>',
}))
vi.mock('../../html/components/map-thumbnail', () => ({ MapThumbnail: () => '' }))
vi.mock('../../pre-ready/views/html/pre-ready-up-button', () => ({
  PreReadyUpButton: () => '<button id="pre-ready-up-button">pre-ready</button>',
}))

import { captainQueueParts } from './captain-queue-parts'

const queue = { _id: new ObjectId() as QueueId, gamemode: Gamemode.sixes }
const roles = captainRoles(Gamemode.sixes)
const id = (index: number) => `7656119800000${String(index).padStart(4, '0')}` as SteamId64
const members: CaptainPoolModel[] = Array.from({ length: 14 }, (unused, index) => ({
  queue: queue._id,
  player: { steamId: id(index), name: `p${index}`, avatarUrl: '' },
  roles: roles.map(roleKey),
  volunteer: index < 2,
  ready: true,
  // the draft's players are locked; the last two signed up for the next game
  locked: index < 12,
  joinedAt: new Date(index),
}))
const draft = {
  queue: queue._id,
  token: 't',
  red: id(0),
  blu: id(1),
  picks: [],
  turn: 0,
  turnStartedAt: new Date(),
  turnDeadline: new Date(Date.now() + 10_000),
  startedAt: new Date(),
  mapOptions: ['cp_badlands', 'cp_process', 'cp_stadium'],
  bans: [],
}

function view(state: QueueState): PoolView {
  return {
    state,
    members,
    pool: members.filter(member => !member.locked),
    readiness: { players: 14, requiredPlayers: 12, coveredRoles: roles.length, volunteers: 2 },
    draft:
      state === QueueState.drafting
        ? getDraftView(Gamemode.sixes, state, draft, members)
        : undefined,
  }
}

// the ids each fragment swaps into, in the order they are sent
async function targets(parts: QueueParts, viewer?: SteamId64) {
  const fragments = await captainQueueParts(queue, parts)
  const html = await Promise.all(
    fragments.map(fragment =>
      fragment({ steamId: viewer, actor: () => Promise.resolve(undefined) }),
    ),
  )
  return html.filter((item): item is string => !!item)
}

const idOf = (html: string) => parse(html).firstElementChild?.id

const draftParts = [
  'captain-draft-status',
  'captain-map-bans',
  'captain-draft-board',
  ...roles.map(role => `captain-draft-role-${role.gameClass}-${role.name}`),
]

beforeEach(() => {
  poolView.view = view(QueueState.drafting)
})

describe('captainQueueParts', () => {
  it('sends a draft update as one frame containing all its parts', async () => {
    const html = await targets({ captainDraft: true }, id(13))

    // nothing is swapped outside the frame, so no part can land where its target is missing
    expect(html.map(idOf)).toEqual(['captain-draft', 'captain-next-game'])
    const frame = parse(html[0]!)
    for (const part of draftParts) {
      expect(frame.querySelector(`#${part}`)).not.toBeNull()
    }
  })

  it('keeps the frame empty while no draft is running', async () => {
    poolView.view = view(QueueState.waiting)
    const html = await targets({ captainDraft: true }, id(13))

    expect(html.map(idOf)).toEqual(['captain-draft', 'captain-next-game'])
    for (const part of draftParts) {
      expect(parse(html[0]!).querySelector(`#${part}`)).toBeNull()
    }
  })

  it('sends the toolbar to a locked draft member without a pre-ready button', async () => {
    const html = await targets({ preReady: true }, id(4))

    expect(html.map(idOf)).toEqual(['captain-actions'])
    expect(parse(html[0]!).querySelector('#pre-ready-up-button')).toBeNull()
  })

  it('sends the toolbar a pre-ready button to a next-game sign-up', async () => {
    const html = await targets({ preReady: true }, id(13))

    expect(html.map(idOf)).toEqual(['captain-actions'])
    expect(parse(html[0]!).querySelector('#pre-ready-up-button')).not.toBeNull()
  })
})
