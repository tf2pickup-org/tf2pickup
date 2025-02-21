import fp from 'fastify-plugin'
import { events } from '../../events'
import { update } from '../update'
import { tasks } from '../../tasks'
import { secondsToMilliseconds } from 'date-fns'
import { GameServerProvider, GameState } from '../../database/models/game.model'

const freeGameServerDelay = secondsToMilliseconds(30)

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    tasks.register('staticGameServers:free', async ({ id }) => {
      await update({ id }, { $unset: { game: 1 } })
    })

    events.on('game:ended', async ({ game }) => {
      if (game.gameServer?.provider !== GameServerProvider.static) {
        return
      }

      if (game.state === GameState.interrupted) {
        await update({ id: game.gameServer.id }, { $unset: { game: 1 } })
      } else {
        await tasks.schedule('staticGameServers:free', freeGameServerDelay, {
          id: game.gameServer.id,
        })
      }
    })
  },
  {
    name: 'free static game servers',
  },
)
