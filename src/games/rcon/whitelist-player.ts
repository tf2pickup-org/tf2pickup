import { deburr } from 'es-toolkit'
import type { GameModel } from '../../database/models/game.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { withRcon } from './with-rcon'
import { players } from '../../players'
import { errors } from '../../errors'

export async function whitelistPlayer(game: GameModel, steamId: SteamId64) {
  const player = await players.bySteamId(steamId, ['steamId', 'name'])

  const slot = game.slots.find(slot => slot.player === player.steamId)
  if (!slot) {
    throw errors.internalServerError(`player ${player.steamId} not found in game #${game.number}`)
  }

  await withRcon(game, async ({ rcon }) => {
    await rcon.send(
      `sm_game_player_add ${player.steamId} -name "${deburr(player.name)}" -team ${slot.team} -class ${slot.gameClass}`,
    )
  })
}
