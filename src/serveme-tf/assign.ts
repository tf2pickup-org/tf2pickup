import { GameServerProvider, type GameModel, type GameServer } from '../database/models/game.model'
import { logger } from '../logger'
import { pickServer } from './pick-server'
import { findServers } from './find-servers'
import { createReservation } from './create-reservation'

export async function assign(game: GameModel, name?: string): Promise<GameServer> {
  const servers = await findServers()
  logger.debug({ servers }, 'serveme.tf servers listed')

  const serverId = await pickServer(servers, name)
  logger.debug({ serverId }, 'serveme.tf server selected')

  const reservation = await createReservation({
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
    logSecret: reservation.logsecret,

    rcon: {
      address: reservation.server.ip,
      port: reservation.server.port,
      password: reservation.rcon,
    },
  }
}
