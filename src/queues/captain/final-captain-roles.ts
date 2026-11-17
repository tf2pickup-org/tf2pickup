import { Tf2Team } from '../../shared/types/tf2-team'
import { isDraftCompletable } from './is-draft-completable'
import { roleKey } from './role-key'
import type { DraftPick } from './types/draft-pick'
import type { DraftPosition } from './types/draft-position'

export function finalCaptainRoles(position: DraftPosition): DraftPick[] | null {
  if (!isDraftCompletable(position) || position.picks.length !== 2 * (position.roles.length - 1)) {
    return null
  }
  return [Tf2Team.red, Tf2Team.blu].flatMap(team =>
    position.roles.flatMap(role => {
      const key = roleKey(role)
      return position.picks.some(pick => pick.team === team && pick.role === key)
        ? []
        : [{ team, player: position.captains[team], role: key }]
    }),
  )
}
