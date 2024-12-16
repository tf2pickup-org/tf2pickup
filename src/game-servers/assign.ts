import { GameServerProvider, type GameModel } from '../database/models/game.model'
import { games } from '../games'
import { staticGameServers } from '../static-game-servers'
import { events } from '../events'
import { GameEventType } from '../database/models/game-event.model'
import { logger } from '../logger'
import { Mutex } from 'async-mutex'

const mutex = new Mutex()

export async function assign(game: GameModel) {
  await mutex.runExclusive(async () => {
    const staticGameServer = await staticGameServers.assign(game)
    if (!staticGameServer) {
      throw new Error(`no free servers available for game ${game.number}`)
    }

    game = await games.update(game.number, {
      $set: {
        gameServer: {
          id: staticGameServer.id,
          name: staticGameServer.name,
          address: staticGameServer.address,
          port: staticGameServer.port,
          provider: GameServerProvider.static,
        },
      },
      $push: {
        events: {
          event: GameEventType.gameServerAssigned,
          at: new Date(),
          gameServerName: staticGameServer.name,
        },
      },
    })
    logger.info({ game }, `game ${game.number} assigned to game server ${staticGameServer.name}`)
    events.emit('game:gameServerAssigned', { game })
  })
}
