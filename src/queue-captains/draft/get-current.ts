import { collections } from '../../database/collections'
import { DraftState, type DraftModel } from '../../database/models/draft.model'

// There is at most one draft running at a time, since there is one queue.
export async function getCurrent(): Promise<DraftModel | null> {
  return await collections.queueCaptainsDrafts.findOne(
    { state: DraftState.picking },
    { sort: { createdAt: -1 } },
  )
}
