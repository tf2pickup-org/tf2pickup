import { events } from '../events'
import { logger } from '../logger'
import { players } from '../players'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { tasks } from '../tasks'

export async function cancel(player: SteamId64) {
  logger.trace({ player }, 'preReady.cancel()')
  await tasks.cancel('preReady:cancel', { player })
  await players.update(player, { $unset: { preReadyUntil: 1 } })
  events.emit('player/preReady:updated', { steamId: player, preReadyUntil: undefined })
}
