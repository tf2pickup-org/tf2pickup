import { Rcon as RconClient } from 'rcon-client'
import { type GameModel } from '../../database/models/game.model'
import { assertIsError } from '../../utils/assert-is-error'
import { logger } from '../../logger'
import { errors } from '../../errors'
import type { RconCommand } from '../../shared/types/rcon-command'

interface Rcon {
  send: (command: RconCommand) => Promise<string>
}

export async function withRcon<T>(
  game: GameModel,
  callback: (args: { rcon: Rcon }) => Promise<T>,
): Promise<T> {
  logger.trace({ gameNumber: game.number }, `withRcon()`)
  if (game.gameServer === undefined) {
    throw errors.internalServerError(`gameServer is undefined`)
  }

  let rcon: RconClient | undefined
  const { address, port, password } = game.gameServer.rcon

  try {
    rcon = await RconClient.connect({
      host: address,
      port: Number(port),
      password: password,
      timeout: 30000,
    })
    rcon.on('error', error => {
      assertIsError(error)
      logger.error(error, `game #${game.number}: rcon error`)
    })

    return await callback({
      rcon: {
        send: async (command: RconCommand) => {
          const ret = await rcon!.send(command)
          if (!rcon!.authenticated) {
            await rcon!.connect()
          }
          return ret
        },
      },
    })
  } finally {
    await rcon?.end()
  }
}
