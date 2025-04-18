import { type GameModel, type GameServer } from '../database/models/game.model'
import { games } from '../games'
import { staticGameServers } from '../static-game-servers'
import { events } from '../events'
import { GameEventType } from '../database/models/game-event.model'
import { logger } from '../logger'
import { Mutex } from 'async-mutex'
import { servemeTf } from '../serveme-tf'
import { errors } from '../errors'

const mutex = new Mutex()

export async function assign(game: GameModel, selected?: string) {
  await mutex.runExclusive(async () => {
    const gameServer = selected ? await assignSelected(game, selected) : await assignFirstFree(game)

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
      throw errors.internalServerError(`no free servers available for game ${game.number}`)
    })
}

function assignSelected(game: GameModel, selected: string): Promise<GameServer> {
  if (selected.startsWith('static:')) {
    const id = selected.substring(7)
    return staticGameServers.assign(game, id)
  }

  throw errors.badRequest(`unknown game server selection: ${selected}`)
}
