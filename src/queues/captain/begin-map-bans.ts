import type { CaptainDraftModel } from '../../database/models/captain-draft.model'
import type { CaptainPoolModel } from '../../database/models/captain-pool.model'
import type { QueueModel } from '../../database/models/queue.model'
import { logger } from '../../logger'
import type { Emit } from '../auto/queue-command'
import { mapOptions } from './map-options'
import { captainDraftMetrics } from './metrics'
import { returnDraftToPool } from './return-draft-to-pool'
import { settleMapBans } from './settle-map-bans'

export async function beginMapBans(
  queue: QueueModel,
  draft: CaptainDraftModel,
  members: readonly CaptainPoolModel[],
  emit: Emit,
) {
  draft.mapOptions = mapOptions(queue.maps)
  draft.bans = []
  if (!draft.mapOptions.length) {
    logger.error({ queue: queue._id }, 'captain draft has no maps available')
    captainDraftMetrics.aborted.add(1, { reason: 'launch_failed' })
    await returnDraftToPool(queue, draft, emit, [], true)
    emit('queue/captainDraft:failed', { queue: queue._id, message: 'No maps available' })
    return
  }
  await settleMapBans(queue, draft, emit, members)
}
