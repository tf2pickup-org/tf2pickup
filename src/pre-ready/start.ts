import { configuration } from '../configuration'
import { logger } from '../logger'
import { players } from '../players'
import type { SteamId64 } from '../shared/types/steam-id-64'

export async function start(player: SteamId64) {
  const timeout = await configuration.get('queue.pre_ready_up_timeout')
  const preReadyUntil = new Date(Date.now() + timeout)

  logger.trace({ timeout, preReadyUntil, player }, 'preReady.start()')

  if (timeout > 0) {
    await players.update(player, { $set: { preReadyUntil } })
  }
}
