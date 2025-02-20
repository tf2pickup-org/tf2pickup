import { GameServerProvider, type GameModel, type GameServer } from '../database/models/game.model'
import { client } from './client'
import { logger } from '../logger'
import { pickServer } from './pick-server'
import { errors } from '../errors'

export async function assign(game: GameModel): Promise<GameServer> {
  if (!client) {
    throw errors.badRequest(`serveme.tf is disabled`)
  }

  const { servers } = await client.findOptions()
  logger.debug({ servers }, 'serveme.tf servers listed')

  const serverId = await pickServer(servers)
  logger.debug({ serverId }, 'serveme.tf server selected')

  const reservation = await client.create({
    serverId,
    enableDemosTf: true,
    enablePlugins: true,
    firstMap: game.map,
  })
  logger.info(
    {
      reservation: {
        id: reservation.id,
        name: reservation.server.name,
        ipAndPort: reservation.server.ip_and_port,
      },
    },
    `reservation created`,
  )

  return {
    provider: GameServerProvider.servemeTf,
    id: reservation.id.toString(),
    name: reservation.server.name,
    address: reservation.server.ip,
    port: reservation.server.port,
    logSecret: reservation.logSecret,

    rcon: {
      address: reservation.server.ip,
      port: reservation.server.port,
      password: reservation.rcon,
    },
  }
}
