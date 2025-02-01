import { deburr } from 'es-toolkit'
import { collections } from '../../database/collections'
import type { GameModel } from '../../database/models/game.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { withRcon } from './with-rcon'
import { addGamePlayer } from './commands'

export async function whitelistPlayer(game: GameModel, steamId: SteamId64) {
  const player = await collections.players.findOne({ steamId })
  if (!player) {
    throw new Error(`player not found: ${steamId}`)
  }

  const slot = game.slots.find(slot => slot.player === player.steamId)
  if (!slot) {
    throw new Error(`player not found in game: ${steamId}`)
  }

  return await withRcon(game, async ({ rcon }) => {
    await rcon.send(addGamePlayer(player.steamId, deburr(player.name), slot.team, slot.gameClass))
  })
}
