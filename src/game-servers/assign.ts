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
    const freeServer = await staticGameServers.findFree()
    if (!freeServer) {
      throw new Error(`no free servers available for game ${game.number}`)
    }

    game = await games.update(game.number, {
      $set: {
        gameServer: {
          id: freeServer.id,
          name: freeServer.name,
          address: freeServer.address,
          port: freeServer.port,
          provider: GameServerProvider.static,
        },
      },
      $push: {
        events: {
          event: GameEventType.gameServerAssigned,
          at: new Date(),
          gameServerName: freeServer.name,
        },
      },
    })
    logger.info({ game }, `game ${game.number} assigned to game server ${freeServer.name}`)
    events.emit('game:gameServerAssigned', { game })
  })
}
