import type { GameModel } from '../../database/models/game.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { withRcon } from './with-rcon'

export async function blacklistPlayer(game: GameModel, steamId: SteamId64) {
  await withRcon(game, async ({ rcon }) => {
    await rcon.send(`sm_game_player_del ${steamId}`)
  })
}
