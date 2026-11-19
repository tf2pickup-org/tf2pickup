import type { CaptainDraftModel } from '../../database/models/captain-draft.model'
import type { CaptainPoolModel } from '../../database/models/captain-pool.model'
import { QueueState } from '../../database/models/queue-state.model'
import type { Gamemode } from '../../shared/types/gamemode'
import { captainRoles } from './captain-roles'
import { currentTurn } from './current-turn'
import { finalCaptainRoles } from './final-captain-roles'
import { getDraftPosition } from './get-draft-position'
import { cachedLegalPicks } from './machine/cached-legal-picks'
import type { DraftView } from './types/draft-view'

export function getDraftView(
  gamemode: Gamemode,
  state: QueueState,
  draft: CaptainDraftModel,
  all: readonly CaptainPoolModel[],
): DraftView {
  const roles = captainRoles(gamemode)
  const position = getDraftPosition(roles, draft, all)
  const turn =
    state === QueueState.drafting ? currentTurn(roles.length, draft.picks.length) : undefined
  return {
    draft,
    members: position.pool as CaptainPoolModel[],
    turn,
    legal: turn ? cachedLegalPicks(draft, position) : [],
    finalRoles: turn ? [] : (finalCaptainRoles(position) ?? []),
  }
}
