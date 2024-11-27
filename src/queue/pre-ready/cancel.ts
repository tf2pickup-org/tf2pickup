import { players } from '../../players'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export async function cancel(player: SteamId64) {
  await players.update(player, { $unset: { preReadyUntil: 1 } })
}
