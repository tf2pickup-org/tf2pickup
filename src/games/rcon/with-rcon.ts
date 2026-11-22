import { Rcon as RconClient } from 'rcon-client'
import { secondsToMilliseconds } from 'date-fns'
import { type GameModel } from '../../database/models/game.model'
import { logger } from '../../logger'
import { errors } from '../../errors'
import type { RconCommand } from '../../shared/types/rcon-command'

export interface Rcon {
  send: (command: RconCommand) => Promise<string>
}

export async function withRcon<T>(
  game: Pick<GameModel, 'number' | 'gameServer'>,
  callback: (args: { rcon: Rcon }) => Promise<T>,
): Promise<T> {
  logger.trace({ gameNumber: game.number }, `withRcon()`)
  if (game.gameServer === undefined) {
    throw errors.internalServerError(`gameServer is undefined`)
  }

  const { address, port, password } = game.gameServer.rcon
  const timeout = secondsToMilliseconds(30)
  const rcon = await RconClient.connect({
    host: address,
    port: Number(port),
    password,
    timeout,
    connectTimeout: timeout,
  })

  try {
    rcon.on('disconnect', error => {
      if (error) {
        logger.error(error, `game #${game.number}: rcon error`)
      }
    })
    return await callback({ rcon })
  } finally {
    await rcon.end()
  }
}
