import { type GameModel } from '../../database/models/game.model'
import { logger } from '../../logger'
import { environment } from '../../environment'
import { withRcon } from './with-rcon'

export async function cleanup(game: GameModel) {
  logger.info({ game }, `cleaning up after game #${game.number}...`)

  await withRcon(game, async ({ rcon }) => {
    await rcon.send(`logaddress_del ${environment.LOG_RELAY_ADDRESS}:${environment.LOG_RELAY_PORT}`)
    await rcon.send(`sm_game_player_delall`)
    await rcon.send(`sm_game_player_whitelist 0`)
  })

  logger.info({ game }, `server cleaned up`)
}
