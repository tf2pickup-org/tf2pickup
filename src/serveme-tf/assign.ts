import { GameServerProvider, type GameNumber } from '../database/models/game.model'
import { client } from './client'
import { logger } from '../logger'
import { pickServer } from './pick-server'
import { errors } from '../errors'
import { games } from '../games'
import { GameEventType } from '../database/models/game-event.model'
import type { SteamId64 } from '../shared/types/steam-id-64'

export async function assign(gameNumber: GameNumber, name?: string, actor?: SteamId64) {
  if (!client) {
    throw errors.badRequest(`serveme.tf is disabled`)
  }

  const { map } = await games.findOne({ number: gameNumber })

  const { servers } = await client.findOptions()
  logger.debug({ servers }, 'serveme.tf servers listed')

  const serverId = await pickServer(servers, name)
  logger.debug({ serverId }, 'serveme.tf server selected')

  const reservation = await client.create({
    serverId,
    enableDemosTf: true,
    enablePlugins: true,
    firstMap: map,
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

  await games.update(gameNumber, {
    $set: {
      gameServer: {
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
      },
    },
    $push: {
      events: {
        event: GameEventType.gameServerAssigned,
        at: new Date(),
        gameServerName: reservation.server.name,
        ...(actor && { actor }),
      },
    },
  })
}
