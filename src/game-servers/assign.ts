import { type GameModel, type GameServer } from '../database/models/game.model'
import { games } from '../games'
import { staticGameServers } from '../static-game-servers'
import { events } from '../events'
import { GameEventType } from '../database/models/game-event.model'
import { logger } from '../logger'
import { Mutex } from 'async-mutex'
import { servemeTf } from '../serveme-tf'

const mutex = new Mutex()

export async function assign(game: GameModel) {
  await mutex.runExclusive(async () => {
    const gameServer = await assignFirstFree(game)

    game = await games.update(game.number, {
      $set: {
        gameServer,
      },
      $push: {
        events: {
          event: GameEventType.gameServerAssigned,
          at: new Date(),
          gameServerName: gameServer.name,
        },
      },
    })
    logger.info({ game }, `game ${game.number} assigned to game server ${gameServer.name}`)
    events.emit('game:gameServerAssigned', { game })
  })
}

function assignFirstFree(game: GameModel): Promise<GameServer> {
  return staticGameServers
    .assign(game)
    .catch(() => servemeTf.assign(game))
    .catch(() => {
      throw new Error(`no free servers available for game ${game.number}`)
    })
}
