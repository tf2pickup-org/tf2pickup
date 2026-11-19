import type { CaptainDraftModel } from '../../database/models/captain-draft.model'
import { legalPicks } from './legal-picks'
import { legalPicksCache } from './legal-picks-cache'
import type { DraftPosition } from './types/draft-position'

// computed once per position, then shared by every viewer and request
export function cachedLegalPicks(draft: CaptainDraftModel, position: DraftPosition) {
  const queue = draft.queue.toHexString()
  const key = `${draft.token}:${draft.picks.length}`
  const cached = legalPicksCache.get(queue)
  if (cached?.key === key) {
    return cached.legal
  }

  const legal = legalPicks(position)
  legalPicksCache.set(queue, { key, legal })
  return legal
}
