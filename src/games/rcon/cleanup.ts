import { type GameModel } from '../../database/models/game.model'
import { logger } from '../../logger'
import { delAllGamePlayers, disablePlayerWhitelist, logAddressDel } from './commands'
import { environment } from '../../environment'
import { withRcon } from './with-rcon'

export async function cleanup(game: GameModel) {
  logger.info({ game }, `cleaning up after game #${game.number}...`)

  await withRcon(game, async ({ rcon }) => {
    await rcon.send(logAddressDel(`${environment.LOG_RELAY_ADDRESS}:${environment.LOG_RELAY_PORT}`))
    await rcon.send(delAllGamePlayers())
    await rcon.send(disablePlayerWhitelist())
  })

  logger.info({ game }, `server cleaned up`)
}
