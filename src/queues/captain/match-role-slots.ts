import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { Tf2Team } from '../../shared/types/tf2-team'
import type { DraftPick } from './types/draft-pick'
import type { PoolPlayer } from './types/pool-player'
import type { RoleSlot } from './types/role-slot'

/** Maximum matching, preserving required captains and restricting each to their own team. */
export function matchRoleSlots(
  slots: readonly RoleSlot[],
  pool: readonly PoolPlayer[],
  pinned: readonly { player: SteamId64; team: Tf2Team }[] = [],
): DraftPick[] | null {
  const teams = new Map(pinned.map(({ player, team }) => [player, team]))
  if (teams.size !== pinned.length) return null

  const players = new Map(pool.map(member => [member.player.steamId, member]))
  const edges = new Map(
    [...players].map(([id, member]) => [
      id,
      slots.flatMap((slot, index) =>
        member.roles.includes(slot.role) && (!teams.has(id) || teams.get(id) === slot.team)
          ? [index]
          : [],
      ),
    ]),
  )
  const occupants = new Map<number, SteamId64>()

  // Each augmenting path seats one new player without dropping anyone already seated.
  // Seating required captains first therefore keeps both present in the final matching.
  function seat(player: SteamId64, visited: Set<number>): boolean {
    for (const slot of edges.get(player) ?? []) {
      if (visited.has(slot)) continue
      visited.add(slot)
      const occupant = occupants.get(slot)
      if (occupant === undefined || seat(occupant, visited)) {
        occupants.set(slot, player)
        return true
      }
    }
    return false
  }

  for (const { player } of pinned) {
    if (!seat(player, new Set())) return null
  }
  for (const player of players.keys()) {
    if (!teams.has(player)) seat(player, new Set())
    if (occupants.size === slots.length) break
  }
  return [...occupants].map(([index, player]) => ({ ...slots[index]!, player }))
}
