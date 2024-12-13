import type { GameModel } from '../../database/models/game.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { delGamePlayer } from './commands'
import { withRcon } from './with-rcon'

export async function blacklistPlayer(game: GameModel, steamId: SteamId64) {
  const slot = game.slots.find(slot => slot.player === steamId)
  if (!slot) {
    throw new Error(`player not found in game: ${steamId}`)
  }

  return await withRcon(game, async ({ rcon }) => {
    await rcon.send(delGamePlayer(steamId))
  })
}
