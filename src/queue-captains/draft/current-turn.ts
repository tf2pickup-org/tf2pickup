import type { DraftModel } from '../../database/models/draft.model'
import type { QueueConfig } from '../../queue/types/queue-config'
import type { Tf2Team } from '../../shared/types/tf2-team'
import { pickOrder } from '../pick-order'

export interface DraftTurn {
  // 0-based index into the pick order
  index: number
  team: Tf2Team
  total: number
}

// Which turn the draft is on, or null once every pick has been made.
export function currentTurn(draft: DraftModel, config: QueueConfig): DraftTurn | null {
  const order = pickOrder(config)
  const index = draft.picks.length
  const team = order[index]

  return team === undefined ? null : { index, team, total: order.length }
}
