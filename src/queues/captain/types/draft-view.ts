import type { CaptainDraftModel } from '../../../database/models/captain-draft.model'
import type { CaptainPoolModel } from '../../../database/models/captain-pool.model'
import type { Tf2Team } from '../../../shared/types/tf2-team'
import type { DraftPick } from './draft-pick'

export interface DraftView {
  draft: CaptainDraftModel
  // the draft's pool: the locked members
  members: CaptainPoolModel[]
  // while picking: the turn on the clock, with the picks it still has
  turn?: { index: number; team: Tf2Team; remaining: number[] } | undefined
  // the picks the captain on the clock may make, computed once per update
  legal: DraftPick[]
  // the captains' own roles, known once the last pick is in
  finalRoles: DraftPick[]
}
