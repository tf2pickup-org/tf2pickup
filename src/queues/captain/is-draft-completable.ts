import { Tf2Team } from '../../shared/types/tf2-team'
import { draftTurns } from './draft-turns'
import { matchRoleSlots } from './match-role-slots'
import { roleSlots } from './role-slots'
import type { DraftPosition } from './types/draft-position'

export function isDraftCompletable({ roles, pool, captains, picks }: DraftPosition): boolean {
  if (roles.length === 0 || captains.red === captains.blu) return false
  const slots = roleSlots(roles)
  const order = draftTurns(roles.length).flatMap(turn => turn.picks.map(() => turn.team))
  const picked = new Set<string>()
  const filled = new Set<string>()
  for (const [index, pick] of picks.entries()) {
    const key = `${pick.team}/${pick.role}`
    if (
      pick.team !== order[index] ||
      pick.player === captains.red ||
      pick.player === captains.blu ||
      picked.has(pick.player) ||
      filled.has(key) ||
      !slots.some(slot => slot.team === pick.team && slot.role === pick.role) ||
      !pool.some(
        member => member.player.steamId === pick.player && member.roles.includes(pick.role),
      )
    ) {
      return false
    }
    picked.add(pick.player)
    filled.add(key)
  }
  const open = slots.filter(slot => !filled.has(`${slot.team}/${slot.role}`))
  const matching = matchRoleSlots(
    open,
    pool.filter(member => !picked.has(member.player.steamId)),
    [
      { player: captains.red, team: Tf2Team.red },
      { player: captains.blu, team: Tf2Team.blu },
    ],
  )
  return matching?.length === open.length
}
