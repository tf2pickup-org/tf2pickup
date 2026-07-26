import { configuration } from '../configuration'
import { events } from '../events'
import { logger } from '../logger'
import { players } from '../players'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { tasks } from '../tasks'

export async function start(player: SteamId64) {
  const timeout = await configuration.get('queue.pre_ready_up_timeout')
  const preReadyUntil = new Date(Date.now() + timeout)

  logger.trace({ timeout, preReadyUntil, player }, 'preReady.start()')

  if (timeout > 0) {
    await players.update(player, { $set: { preReadyUntil } })
    // start() runs again every time the player re-enters the ready flow, so the
    // previous expiry has to go before arming the new one
    await tasks.cancel('preReady:cancel', { player })
    await tasks.schedule('preReady:cancel', timeout, { player })
    events.emit('player/preReady:updated', { steamId: player, preReadyUntil })
  }
}
