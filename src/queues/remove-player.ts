import type { SteamId64 } from '../shared/types/steam-id-64'
import { removePlayer as autoRemovePlayer } from './auto/remove-player'
import { kickFromPools } from './captain/kick-from-pools'

// forgets a player for good, in every queue
export async function removePlayer(steamId: SteamId64) {
  await autoRemovePlayer(steamId)
  await kickFromPools(steamId)
}
