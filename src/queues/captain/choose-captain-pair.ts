import type { SteamId64 } from '../../shared/types/steam-id-64'
import { isDraftCompletable } from './is-draft-completable'
import { poolReadiness } from './pool-readiness'
import type { CaptainRole } from './types/captain-role'
import type { PoolPlayer } from './types/pool-player'

/** Draw one eligible unordered pair; assign its RED/BLU teams randomly at draft entry. */
export function chooseCaptainPair(
  roles: readonly CaptainRole[],
  pool: readonly PoolPlayer[],
  random: () => number,
): [SteamId64, SteamId64] | null {
  if (!poolReadiness(roles, pool).full) return null
  const volunteers = pool.filter(member => member.volunteer)
  const candidates: [SteamId64, SteamId64][] = []
  for (const [index, first] of volunteers.entries()) {
    for (const second of volunteers.slice(index + 1)) {
      candidates.push([first.player.steamId, second.player.steamId])
    }
  }
  // Fisher-Yates without replacement: test a random candidate, then stop as soon
  // as it is feasible. No matching is calculated for unexamined candidate pairs.
  while (candidates.length > 0) {
    const index = Math.floor(random() * candidates.length)
    const [pair] = candidates.splice(index, 1)
    const [red, blu] = pair!
    if (isDraftCompletable({ roles, pool, captains: { red, blu }, picks: [] })) return pair!
  }
  return null
}
