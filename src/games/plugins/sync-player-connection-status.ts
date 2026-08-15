import fp from 'fastify-plugin'
import { collections } from '../../database/collections'
import { type GameModel, GameState } from '../../database/models/game.model'
import { syncPlayerConnectionStatus } from '../sync-player-connection-status'

export default fp(
  async () => {
    // Find all running games
    const runningGames = await collections.games
      .find<Pick<GameModel, 'number'>>(
        { state: { $in: [GameState.launching, GameState.started] }, gameServer: { $exists: true } },
        { projection: { number: 1 } },
      )
      .toArray()

    await Promise.all(runningGames.map(game => syncPlayerConnectionStatus(game.number)))
  },
  { name: 'sync player connection status' },
)
