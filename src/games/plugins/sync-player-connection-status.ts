import fp from 'fastify-plugin'
import { collections } from '../../database/collections'
import { type GameModel, GameState } from '../../database/models/game.model'
import { safe } from '../../utils/safe'
import { syncPlayerConnectionStatus } from '../sync-player-connection-status'

export default fp(
  app => {
    app.addHook(
      'onListen',
      safe(async () => {
        const runningGames = await collections.games
          .find<Pick<GameModel, 'number'>>(
            {
              state: { $in: [GameState.launching, GameState.started] },
              gameServer: { $exists: true },
            },
            { projection: { number: 1 } },
          )
          .toArray()

        await Promise.all(runningGames.map(game => syncPlayerConnectionStatus(game.number)))
      }),
    )
  },
  { name: 'sync player connection status' },
)
