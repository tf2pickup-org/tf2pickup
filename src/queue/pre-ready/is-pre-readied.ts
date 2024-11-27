import { players } from '../../players'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export async function isPreReadied(player: SteamId64) {
  const p = await players.bySteamId(player)
  return p.preReadyUntil && p.preReadyUntil.getTime() > Date.now()
}
