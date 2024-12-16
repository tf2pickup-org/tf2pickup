import fp from 'fastify-plugin'
import { events } from '../../events'
import { update } from '../update'
import { tasks } from '../../tasks'
import { secondsToMilliseconds } from 'date-fns'
import { whenGameEnds } from '../../games/when-game-ends'
import { GameServerProvider, GameState } from '../../database/models/game.model'

const freeGameServerDelay = secondsToMilliseconds(30)

export default fp(
  async () => {
    tasks.register('staticGameServers:free', async ({ id }) => {
      await update({ id }, { $unset: { game: 1 } })
    })

    events.on(
      'game:updated',
      whenGameEnds(async ({ after }) => {
        if (after.gameServer?.provider !== GameServerProvider.static) {
          return
        }

        if (after.state === GameState.interrupted) {
          await update({ id: after.gameServer.id }, { $unset: { game: 1 } })
        } else {
          tasks.schedule('staticGameServers:free', freeGameServerDelay, { id: after.gameServer.id })
        }
      }),
    )
  },
  {
    name: 'free static game servers',
  },
)
