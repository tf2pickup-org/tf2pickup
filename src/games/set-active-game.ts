import type { GameNumber } from '../database/models/game.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { events } from '../events'
import { players } from '../players'

export async function setActiveGame(steamId: SteamId64, activeGame: GameNumber | undefined) {
  await players.update(
    steamId,
    activeGame === undefined ? { $unset: { activeGame: 1 } } : { $set: { activeGame } },
  )
  events.emit('player/activeGame:updated', { steamId, activeGame })
}
