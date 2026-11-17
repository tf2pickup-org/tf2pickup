import { legalPicks } from './legal-picks'
import type { DraftPick } from './types/draft-pick'
import type { DraftPosition } from './types/draft-position'

/** One pick only: call again after applying it for the remainder of a double turn. */
export function timeoutPick(position: DraftPosition): DraftPick | null {
  const pool = [...position.pool].sort(
    (first, second) => first.joinedAt.getTime() - second.joinedAt.getTime(),
  )
  // legalPicks preserves pool order, then configured role order; ties are stable.
  return legalPicks({ ...position, pool })[0] ?? null
}
