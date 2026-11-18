import type { CaptainDraftModel } from '../../database/models/captain-draft.model'
import type { CaptainPoolModel } from '../../database/models/captain-pool.model'
import { Tf2Team } from '../../shared/types/tf2-team'
import type { CaptainRole } from './types/captain-role'
import type { DraftPosition } from './types/draft-position'

// the draft pool is the locked members; later sign-ups are for the next game
export function getDraftPosition(
  roles: readonly CaptainRole[],
  draft: Pick<CaptainDraftModel, 'red' | 'blu' | 'picks'>,
  members: readonly CaptainPoolModel[],
): DraftPosition {
  return {
    roles,
    pool: members.filter(member => member.locked),
    captains: { [Tf2Team.red]: draft.red, [Tf2Team.blu]: draft.blu },
    picks: draft.picks.map(({ team, player, role }) => ({ team, player, role })),
  }
}
