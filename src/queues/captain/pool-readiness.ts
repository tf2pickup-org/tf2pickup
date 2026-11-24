import { matchRoleSlots } from './match-role-slots'
import { roleKey } from './role-key'
import { roleSlots } from './role-slots'
import type { CaptainRole } from './types/captain-role'
import type { PoolPlayer } from './types/pool-player'

export function poolReadiness(roles: readonly CaptainRole[], pool: readonly PoolPlayer[]) {
  const volunteers = pool.filter(member => member.volunteer)
  // A maximal independent set of volunteers extends to a maximum matching of the
  // whole pool. Augmenting paths preserve those already seated, so this also
  // maximizes the number of volunteers in a perfect matching.
  const matching = matchRoleSlots(roleSlots(roles), [
    ...volunteers,
    ...pool.filter(member => !member.volunteer),
  ])!
  const seated = new Set(matching.map(({ player }) => player))
  const coveredRoles = roles.filter(
    role => matching.filter(slot => slot.role === roleKey(role)).length === 2,
  ).length
  return {
    full:
      roles.length > 0 &&
      matching.length === roles.length * 2 &&
      volunteers.filter(member => seated.has(member.player.steamId)).length >= 2,
    players: pool.length,
    requiredPlayers: roles.length * 2,
    coveredRoles,
    volunteers: volunteers.length,
  }
}
