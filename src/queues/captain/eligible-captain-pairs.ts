import type { SteamId64 } from '../../shared/types/steam-id-64'
import { isDraftCompletable } from './is-draft-completable'
import type { CaptainRole } from './types/captain-role'
import type { PoolPlayer } from './types/pool-player'

/** Exhaustive eligibility inspection for tests. Draft entry uses chooseCaptainPair instead. */
export function eligibleCaptainPairs(
  roles: readonly CaptainRole[],
  pool: readonly PoolPlayer[],
): [SteamId64, SteamId64][] {
  const volunteers = pool.filter(member => member.volunteer)
  const pairs: [SteamId64, SteamId64][] = []
  for (const [index, first] of volunteers.entries()) {
    for (const second of volunteers.slice(index + 1)) {
      const red = first.player.steamId
      const blu = second.player.steamId
      if (isDraftCompletable({ roles, pool, captains: { red, blu }, picks: [] })) {
        pairs.push([red, blu])
      }
    }
  }
  return pairs
}
