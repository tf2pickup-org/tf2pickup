import type { QueueId, QueueModel } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { Emit } from '../auto/queue-command'
import { get } from '../get'
import { getState } from '../get-state'
import { assertCaptainQueue } from './assert-captain-queue'
import { captainRoles } from './captain-roles'
import { decideCaptain } from './decide-captain'
import { enterState } from './enter-state'
import { getPool } from './get-pool'
import { poolReadiness } from './pool-readiness'

// Must run inside queueCommand(). Reuses reads from the calling command; the
// boolean says whether its actor was auto-readied by filling the pool.
export async function advance(
  queue: QueueId,
  emit: Emit,
  known?: { state: QueueState; settings: QueueModel; last?: SteamId64 },
): Promise<boolean> {
  const [state, settings, initialPool] = await Promise.all([
    known?.state ?? getState(queue),
    known?.settings ?? get(queue),
    getPool(queue),
  ])
  assertCaptainQueue(settings)
  const { full } = poolReadiness(captainRoles(settings.gamemode), initialPool)
  const next = decideCaptain(state, { full, allReady: initialPool.every(member => member.ready) })
  if (next === null) return false

  const pool = await enterState(settings, next, emit, initialPool, known?.last)
  if (next === QueueState.ready && pool.every(member => member.ready)) {
    await enterState(settings, QueueState.drafting, emit, pool)
  }
  // Readiness was cleared when the pool ceased to be full.
  if (next === QueueState.waiting) return false
  return next === QueueState.ready && pool.some(member => member.player.steamId === known?.last)
}
