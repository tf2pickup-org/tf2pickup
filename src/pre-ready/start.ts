import { configuration } from '../configuration'
import { players } from '../players'
import type { SteamId64 } from '../shared/types/steam-id-64'

export async function start(player: SteamId64) {
  const timeout = await configuration.get('queue.pre_ready_up_timeout')
  const preReadyUntil = new Date(Date.now() + timeout)

  if (timeout > 0) {
    await players.update(player, { $set: { preReadyUntil } })
  }
}
