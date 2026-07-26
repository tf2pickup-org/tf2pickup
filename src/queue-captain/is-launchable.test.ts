import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Tf2ClassName } from '../shared/types/tf2-class-name'
import { Tf2Team } from '../shared/types/tf2-team'

vi.mock('../database/collections', () => ({
  collections: {
    captainDraft: { findOne: vi.fn() },
    queuePlayers: { countDocuments: vi.fn() },
  },
}))

vi.mock('../environment', () => ({
  environment: { QUEUE_CONFIG: '6v6' },
}))

import { isLaunchable } from './is-launchable'
import { collections } from '../database/collections'
import { getPickOrder } from './get-pick-order'
import { queueConfigs } from '../queue-auto/configs'

const pickCount = getPickOrder(queueConfigs['6v6']!).length

function draftWith(overrides: Record<string, unknown> = {}) {
  return {
    captains: { [Tf2Team.blu]: 'blu-captain', [Tf2Team.red]: 'red-captain' },
    picks: Array.from({ length: pickCount }, (_, i) => ({
      captain: 'blu-captain',
      player: `player-${i.toString()}`,
      gameClass: Tf2ClassName.scout,
      team: Tf2Team.blu,
    })),
    mapOptions: [],
    mapBans: [],
    selectedMap: 'cp_process_final',
    currentTurn: Tf2Team.blu,
    expiresAt: new Date(),
    ...overrides,
  }
}

describe('isLaunchable()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is false when there is no draft', async () => {
    vi.mocked(collections.captainDraft.findOne).mockResolvedValue(null)

    expect(await isLaunchable()).toBe(false)
  })

  it('is false when no map has been selected', async () => {
    const draft = draftWith({ selectedMap: undefined })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(collections.captainDraft.findOne).mockResolvedValue(draft as any)

    expect(await isLaunchable()).toBe(false)
  })

  it('is false when not every pick has been made', async () => {
    const draft = draftWith()
    draft.picks.pop()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(collections.captainDraft.findOne).mockResolvedValue(draft as any)

    expect(await isLaunchable()).toBe(false)
  })

  it('is false when a drafted player has left the queue', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(collections.captainDraft.findOne).mockResolvedValue(draftWith() as any)
    vi.mocked(collections.queuePlayers.countDocuments).mockResolvedValue(pickCount + 1)

    expect(await isLaunchable()).toBe(false)
  })

  it('is true when every invariant holds', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(collections.captainDraft.findOne).mockResolvedValue(draftWith() as any)
    vi.mocked(collections.queuePlayers.countDocuments).mockResolvedValue(pickCount + 2)

    expect(await isLaunchable()).toBe(true)
  })
})
