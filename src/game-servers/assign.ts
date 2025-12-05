import { type GameModel, type GameNumber, type GameServer } from '../database/models/game.model'
import { games } from '../games'
import { staticGameServers } from '../static-game-servers'
import { events } from '../events'
import { GameEventType } from '../database/models/game-event.model'
import { logger } from '../logger'
import { Mutex } from 'async-mutex'
import { servemeTf } from '../serveme-tf'
import { errors } from '../errors'
import { capitalize, isError, retry } from 'es-toolkit'
import { secondsToMilliseconds } from 'date-fns'

const mutex = new Mutex()

export async function assign(game: GameModel, selected?: string) {
  await mutex.runExclusive(async () => {
    try {
      const gameServer = selected
        ? await assignSelected(game, selected)
        : await assignFirstFree(game)

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
    } catch (error) {
      if (!isError(error)) {
        throw error
      }

      if (!selected) {
        await games.update(game.number, {
          $push: {
            events: {
              event: GameEventType.runtimeError,
              at: new Date(),
              message: capitalize(error.message),
            },
          },
        })
      }

      throw error
    }
  })
}

class NoFreeGameServersError extends Error {
  constructor(public readonly gameNumber: GameNumber) {
    super(`no free servers available`)
  }
}

function assignFirstFree(game: GameModel): Promise<GameServer> {
  return retry(
    async () =>
      staticGameServers
        .assign(game)
        .catch(() => servemeTf.assign(game))
        .catch(() => {
          throw new NoFreeGameServersError(game.number)
        }),
    { retries: 3, delay: secondsToMilliseconds(10) },
  )
}

function assignSelected(game: GameModel, selected: string): Promise<GameServer> {
  if (selected.startsWith('static:')) {
    const id = selected.substring(7)
    return staticGameServers.assign(game, id)
  }

  if (selected.startsWith('servemeTf:')) {
    const name = selected.substring(10)
    return servemeTf.assign(game, name)
  }

  throw errors.badRequest(`unknown game server selection: ${selected}`)
}
