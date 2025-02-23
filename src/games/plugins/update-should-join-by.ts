import fp from 'fastify-plugin'
import { events } from '../../events'
import { configuration } from '../../configuration'
import { update } from '../update'
import { PlayerConnectionStatus, SlotStatus } from '../../database/models/game-slot.model'
import { calculateJoinGameserverTimeout } from '../calculate-join-gameserver-timeout'
import { safe } from '../../utils/safe'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('game:gameServerInitialized', async ({ game }) => {
      const joinTimeout = await configuration.get('games.join_gameserver_timeout')
      if (joinTimeout === 0) {
        return
      }

      const shouldJoinBy = new Date(Date.now() + joinTimeout)
      await update(
        game.number,
        {
          $set: {
            'slots.$[slot].shouldJoinBy': shouldJoinBy,
          },
        },
        {
          arrayFilters: [
            {
              'slot.status': SlotStatus.active,
            },
          ],
        },
      )
    })

    events.on(
      'game:playerReplaced',
      safe(async ({ game, replacement }) => {
        const shouldJoinBy = await calculateJoinGameserverTimeout(game, replacement)
        if (!shouldJoinBy) {
          return
        }

        await update(
          game.number,
          {
            $set: {
              'slots.$[slot].shouldJoinBy': shouldJoinBy,
            },
          },
          {
            arrayFilters: [
              {
                'slot.player': replacement,
              },
            ],
          },
        )
      }),
    )

    events.on(
      'game:playerConnectionStatusUpdated',
      safe(async ({ game, player, playerConnectionStatus }) => {
        if (playerConnectionStatus !== PlayerConnectionStatus.offline) {
          return
        }

        const shouldJoinBy = await calculateJoinGameserverTimeout(game, player)
        if (!shouldJoinBy) {
          return
        }

        await update(
          game.number,
          {
            $set: {
              'slots.$[slot].shouldJoinBy': shouldJoinBy,
            },
          },
          {
            arrayFilters: [
              {
                'slot.player': player,
              },
            ],
          },
        )
      }),
    )
  },
  {
    name: "update 'should join by' field",
  },
)
