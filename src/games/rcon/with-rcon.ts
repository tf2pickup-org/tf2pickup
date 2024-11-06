import { Rcon } from 'rcon-client'
import { collections } from '../../database/collections'
import { type GameModel, GameServerProvider } from '../../database/models/game.model'
import { assertIsError } from '../../utils/assert-is-error'
import { logger } from '../../logger'
import type { StaticGameServerModel } from '../../database/models/static-game-server.model'

export async function withRcon<T>(
  game: GameModel,
  callback: (args: { rcon: Rcon; gameServer: StaticGameServerModel }) => Promise<T>,
): Promise<T> {
  if (game.gameServer === undefined) {
    throw new Error(`gameServer is undefined`)
  }
  if (game.gameServer.provider !== GameServerProvider.static) {
    throw new Error(`gameServer provider not supported`)
  }

  logger.trace({ game }, `withRcon()`)

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

    return await callback({ rcon, gameServer })
  } finally {
    await rcon?.end()
  }
}
