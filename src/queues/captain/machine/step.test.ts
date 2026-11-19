import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../get-state', () => ({ getState: vi.fn() }))
vi.mock('../get-pool', () => ({ getPool: vi.fn() }))
vi.mock('../pool-readiness', () => ({ poolReadiness: vi.fn() }))
vi.mock('./to-ready', () => ({ toReady: vi.fn() }))
vi.mock('./to-drafting', () => ({ toDrafting: vi.fn() }))
vi.mock('./to-waiting', () => ({ toWaiting: vi.fn() }))

import { ObjectId } from 'mongodb'
import type { CaptainPoolModel } from '../../../database/models/captain-pool.model'
import type { QueueId, QueueModel } from '../../../database/models/queue.model'
import { QueueState } from '../../../database/models/queue-state.model'
import { Gamemode } from '../../../shared/types/gamemode'
import { getState } from '../../get-state'
import { captainRoles } from '../captain-roles'
import { getPool } from '../get-pool'
import { poolReadiness } from '../pool-readiness'
import { step } from './step'
import { toDrafting } from './to-drafting'
import { toReady } from './to-ready'
import { toWaiting } from './to-waiting'

const queue = {
  _id: new ObjectId() as QueueId,
  launchMode: 'captain',
  gamemode: Gamemode.sixes,
} as QueueModel
const emit = vi.fn()
const member = (ready: boolean) => ({ ready }) as CaptainPoolModel

function given(state: QueueState, full: boolean, pool: CaptainPoolModel[]) {
  vi.mocked(getState).mockResolvedValue(state)
  vi.mocked(getPool).mockResolvedValue(pool)
  vi.mocked(poolReadiness).mockReturnValue({ full } as never)
}

describe('step()', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("judges the pool against the queue's gamemode roles", async () => {
    const pool = [member(false)]
    given(QueueState.waiting, false, pool)
    await step(queue, emit)
    expect(poolReadiness).toHaveBeenCalledWith(captainRoles(Gamemode.sixes), pool)
  })

  it('stays put when no transition applies', async () => {
    given(QueueState.waiting, false, [member(false)])
    expect(await step(queue, emit)).toBe(false)
    expect(toReady).not.toHaveBeenCalled()
    expect(toDrafting).not.toHaveBeenCalled()
    expect(toWaiting).not.toHaveBeenCalled()
  })

  it('enters ready-up with the pool it read once the pool is full', async () => {
    const pool = [member(false), member(true)]
    given(QueueState.waiting, true, pool)
    expect(await step(queue, emit)).toBe(true)
    expect(toReady).toHaveBeenCalledExactlyOnceWith(queue, emit, pool)
  })

  it('takes one transition at a time: a fully ready pool in waiting enters ready, not drafting', async () => {
    given(QueueState.waiting, true, [member(true), member(true)])
    await step(queue, emit)
    expect(toReady).toHaveBeenCalledExactlyOnceWith(queue, emit, expect.any(Array))
    expect(toDrafting).not.toHaveBeenCalled()
  })

  it('starts the draft once everyone in a full pool is ready', async () => {
    given(QueueState.ready, true, [member(true), member(true)])
    expect(await step(queue, emit)).toBe(true)
    expect(toDrafting).toHaveBeenCalledWith(queue, emit, expect.any(Array))
  })
  it('returns to waiting when a ready pool is no longer full', async () => {
    given(QueueState.ready, false, [member(true)])
    expect(await step(queue, emit)).toBe(true)
    expect(toWaiting).toHaveBeenCalledExactlyOnceWith(queue, emit)
  })
})
