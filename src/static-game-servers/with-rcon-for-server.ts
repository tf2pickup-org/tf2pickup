import { Rcon as RconClient } from 'rcon-client'
import { type StaticGameServerModel } from '../database/models/static-game-server.model'
import { assertIsError } from '../utils/assert-is-error'
import { logger } from '../logger'
import type { RconCommand } from '../shared/types/rcon-command'

interface Rcon {
  send: (command: RconCommand) => Promise<string>
}

export async function withRconForServer<T>(
  server: StaticGameServerModel,
  callback: (args: { rcon: Rcon }) => Promise<T>,
): Promise<T> {
  logger.trace({ serverId: server.id }, `withRconForServer()`)

  let rcon: RconClient | undefined

  try {
    rcon = await RconClient.connect({
      host: server.internalIpAddress,
      port: Number(server.port),
      password: server.rconPassword,
      timeout: 30000,
    })
    rcon.on('error', error => {
      assertIsError(error)
      logger.error(error, `server ${server.name}: rcon error`)
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
