import { Rcon } from 'rcon-client'
import { type GameModel } from '../../database/models/game.model'
import { assertIsError } from '../../utils/assert-is-error'
import { logger } from '../../logger'
import { errors } from '../../errors'

export async function withRcon<T>(
  game: GameModel,
  callback: (args: { rcon: Rcon }) => Promise<T>,
): Promise<T> {
  logger.trace({ gameNumber: game.number }, `withRcon()`)
  if (game.gameServer === undefined) {
    throw errors.internalServerError(`gameServer is undefined`)
  }

  let rcon: Rcon | undefined = undefined
  const { address, port, password } = game.gameServer.rcon

  try {
    rcon = await Rcon.connect({
      host: address,
      port: Number(port),
      password: password,
      timeout: 30000,
    })
    rcon.on('error', error => {
      assertIsError(error)
      logger.error(error, `game #${game.number}: rcon error`)
    })

    return await callback({ rcon })
  } finally {
    await rcon?.end()
  }
}
