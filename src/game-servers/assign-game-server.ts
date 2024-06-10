import fp from 'fastify-plugin'
import { GameState, type GameModel } from '../database/models/game.model'
import { games } from '../games'
import { staticGameServers } from '../static-game-servers'
import { mutex } from './mutex'
import { events } from '../events'
import { GameEventType } from '../database/models/game-event.model'
import { logger } from '../logger'
import { collections } from '../database/collections'

export async function assignGameServer(game: GameModel) {
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
          rconPassword: freeServer.rconPassword,
          provider: 'static',
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
    logger.info(`game ${game.number} assigned to game server ${freeServer.name}`)
    events.emit('game:gameServerAssigned', { game })
  })
}

async function getOrphanedGames() {
  return await collections.games
    .find({ state: GameState.created, gameServer: { $exists: false } })
    .toArray()
}

export default fp(async () => {
  events.on('game:created', async ({ game }) => {
    await assignGameServer(game)
  })

  const orphanedGames = await getOrphanedGames()
  for (const game of orphanedGames) {
    await assignGameServer(game)
  }
})
