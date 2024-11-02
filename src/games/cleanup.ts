import { Rcon } from 'rcon-client'
import { GameServerProvider, type GameModel } from '../database/models/game.model'
import { logger } from '../logger'
import { collections } from '../database/collections'
import { assertIsError } from '../utils/assert-is-error'
import { delAllGamePlayers, disablePlayerWhitelist, logAddressDel } from './rcon-commands'
import { environment } from '../environment'

export async function cleanup(game: GameModel) {
  if (!game.gameServer) {
    throw new Error(`gameServer is undefined`)
  }
  if (game.gameServer.provider !== GameServerProvider.static) {
    throw new Error(`gameServer provider not supported`)
  }

  logger.info({ game }, `cleaning up after game #${game.number}...`)
  const gameServer = await collections.staticGameServers.findOne({ id: game.gameServer.id })
  if (gameServer === null) {
    throw new Error(`gameServer not found`)
  }

  let rcon: Rcon | undefined = undefined
  try {
    rcon = await Rcon.connect({
      host: gameServer.internalIpAddress,
      port: Number(gameServer.port),
      password: gameServer.rconPassword,
    })
    rcon.on('error', error => {
      assertIsError(error)
      logger.error(error, `game #${game.number}: rcon error`)
    })

    await rcon.send(logAddressDel(`${environment.LOG_RELAY_ADDRESS}:${environment.LOG_RELAY_PORT}`))
    await rcon.send(delAllGamePlayers())
    await rcon.send(disablePlayerWhitelist())
    logger.info({ game }, `server cleaned up`)
  } finally {
    await rcon?.end()
  }
}
