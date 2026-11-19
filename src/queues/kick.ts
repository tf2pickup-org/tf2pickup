import type { SteamId64 } from '../shared/types/steam-id-64'
import { kick as autoKick } from './auto/kick'
import { kickFromPools } from './captain/kick-from-pools'

// Drops the players from whatever queue they are in. Locked captain draft members stay.
export async function kick(...steamIds: SteamId64[]) {
  const failed = (
    await Promise.allSettled([autoKick(...steamIds), kickFromPools(...steamIds)])
  ).find((result): result is PromiseRejectedResult => result.status === 'rejected')
  if (failed) {
    throw failed.reason
  }
}
