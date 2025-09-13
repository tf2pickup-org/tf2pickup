import { logger } from '../logger'
import { players } from '../players'
import type { SteamId64 } from '../shared/types/steam-id-64'

export async function cancel(player: SteamId64) {
  logger.trace({ player }, 'preReady.cancel()')
  await players.update(player, { $unset: { preReadyUntil: 1 } })
}
