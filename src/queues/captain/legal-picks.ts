import { draftTurns } from './draft-turns'
import { isDraftCompletable } from './is-draft-completable'
import { matchRoleSlots } from './match-role-slots'
import { roleKey } from './role-key'
import { roleSlots } from './role-slots'
import { Tf2Team } from '../../shared/types/tf2-team'
import type { DraftPick } from './types/draft-pick'
import type { DraftPosition } from './types/draft-position'

/** Compute once per turn change, then share across viewers. Validate a submitted
 * pick with isDraftCompletable instead of rebuilding the entire legal-pick set. */
export function legalPicks(position: DraftPosition): DraftPick[] {
  if (!isDraftCompletable(position)) return []
  const { roles, pool, captains, picks } = position
  const turn = draftTurns(roles.length).find(turn => turn.picks.includes(picks.length + 1))
  if (!turn) return []
  const picked = new Set(picks.map(pick => pick.player))
  const available = pool.filter(member => !picked.has(member.player.steamId))
  const slots = roleSlots(roles).filter(
    slot => !picks.some(pick => pick.team === slot.team && pick.role === slot.role),
  )
  const matching = matchRoleSlots(slots, available, [
    { player: captains.red, team: Tf2Team.red },
    { player: captains.blu, team: Tf2Team.blu },
  ])!

  // Residual graph for one complete matching. An unchosen edge is feasible iff
  // it closes an alternating cycle. The source also connects unmatched surplus
  // players, allowing one noncaptain to replace another without dropping a seat.
  // Required captains have no reverse edge to the source: a cycle can move a
  // captain between their own roles, but can never unseat them.
  const source = 0
  const slotOffset = available.length + 1
  const edges: number[][] = Array.from({ length: slotOffset + slots.length }, () => [])
  const assigned = new Map(matching.map(pick => [pick.player, pick]))
  for (const [index, member] of available.entries()) {
    const playerNode = index + 1
    const id = member.player.steamId
    const captainTeam = id === captains.red ? Tf2Team.red : id === captains.blu ? Tf2Team.blu : null
    const seat = assigned.get(id)
    if (!seat) edges[source]!.push(playerNode)
    else if (!captainTeam) edges[playerNode]!.push(source)

    for (const [slotIndex, slot] of slots.entries()) {
      if (!member.roles.includes(slot.role) || (captainTeam && slot.team !== captainTeam)) continue
      const slotNode = slotOffset + slotIndex
      if (seat?.team === slot.team && seat.role === slot.role) edges[slotNode]!.push(playerNode)
      else edges[playerNode]!.push(slotNode)
    }
  }

  const reachable = new Map<string, Set<number>>()
  for (const [index, slot] of slots.entries()) {
    if (slot.team !== turn.team) continue
    const seen = new Set<number>()
    const pending = [slotOffset + index]
    while (pending.length > 0) {
      const node = pending.pop()!
      if (seen.has(node)) continue
      seen.add(node)
      pending.push(...edges[node]!)
    }
    reachable.set(slot.role, seen)
  }

  return available.flatMap((member, index) => {
    const player = member.player.steamId
    if (player === captains.red || player === captains.blu) return []
    const seat = assigned.get(player)
    return roles.flatMap(role => {
      const key = roleKey(role)
      if (!member.roles.includes(key)) return []
      const matched = seat?.team === turn.team && seat.role === key
      return matched || reachable.get(key)?.has(index + 1)
        ? [{ team: turn.team, player, role: key }]
        : []
    })
  })
}
