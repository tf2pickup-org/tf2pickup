import { collections } from '../../database/collections'
import { DraftState, type DraftModel } from '../../database/models/draft.model'

// The draft still being run — picking players or banning maps. There is at most one at a time,
// since there is one queue.
export async function getCurrent(): Promise<DraftModel | null> {
  return await collections.queueCaptainsDrafts.findOne(
    { state: { $in: [DraftState.picking, DraftState.banningMaps] } },
    { sort: { createdAt: -1 } },
  )
}
