import fp from 'fastify-plugin'
import { events } from '../../events'
import { update } from '../update'
import { tasks } from '../../tasks'
import { secondsToMilliseconds } from 'date-fns'
import { GameServerProvider, GameState } from '../../database/models/game.model'
import { logger } from '../../logger'

const freeGameServerDelay = secondsToMilliseconds(30)

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    tasks.register('staticGameServers:free', async ({ id }) => {
      await update({ id }, { $unset: { game: 1 } })
    })

    events.on('game:updated', async ({ before, after }) => {
      const previous = before.gameServer
      if (
        previous?.provider !== GameServerProvider.static ||
        (after.gameServer?.provider === GameServerProvider.static &&
          after.gameServer.id === previous.id)
      ) {
        return
      }

      try {
        await update({ id: previous.id, game: before.number }, { $unset: { game: 1 } })
      } catch (error) {
        logger.error(
          { error },
          `failed to free static game server ${previous.name} after game #${before.number} was reassigned`,
        )
      }
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
