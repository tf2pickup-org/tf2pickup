import fp from 'fastify-plugin'
import { events } from '../../events'
import { configuration } from '../../configuration'
import { tasks } from '../../tasks'
import { requestSubstitute } from '../request-substitute'
import { PlayerConnectionStatus, SlotStatus } from '../../database/models/game-slot.model'
import { calculateJoinGameserverTimeout } from '../calculate-join-gameserver-timeout'
import { safe } from '../../utils/safe'
import { syncPlayerConnectionStatus } from '../sync-player-connection-status'
import { findOne } from '../find-one'
import { errors } from '../../errors'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    tasks.register('games:autoSubstitutePlayer', async ({ gameNumber, player }) => {
      await syncPlayerConnectionStatus(gameNumber)

      const game = await findOne({ number: gameNumber }, ['slots'])
      const slot = game.slots.find(slot => slot.player === player)
      if (!slot) {
        throw errors.badRequest(`player is not a member of game ${gameNumber}`)
      }

      if (slot.connectionStatus !== PlayerConnectionStatus.offline) {
        return
      }

      await requestSubstitute({
        number: gameNumber,
        replacee: player,
        actor: 'bot',
        reason: 'Player is offline',
        applyCooldown: true,
      })
    })

    events.on('game:ended', async ({ game }) => {
      await tasks.cancel('games:autoSubstitutePlayer', { gameNumber: game.number })
    })

    events.on('match/player:connected', async ({ gameNumber, steamId }) => {
      await tasks.cancel('games:autoSubstitutePlayer', { gameNumber, player: steamId })
    })

    events.on('game:substituteRequested', async ({ game, replacee }) => {
      await tasks.cancel('games:autoSubstitutePlayer', {
        gameNumber: game.number,
        player: replacee,
      })
    })

    events.on(
      'game:gameServerInitialized',
      safe(async ({ game }) => {
        const joinTimeout = await configuration.get('games.join_gameserver_timeout')
        if (joinTimeout <= 0) {
          return
        }

        await Promise.all(
          game.slots
            .filter(slot => slot.status === SlotStatus.active)
            .map(({ player }) => player)
            .map(async player => {
              await tasks.schedule('games:autoSubstitutePlayer', joinTimeout, {
                gameNumber: game.number,
                player,
              })
            }),
        )
      }),
    )

    events.on(
      'game:playerReplaced',
      safe(async ({ game, replacement }) => {
        const timeout = await calculateJoinGameserverTimeout(game, replacement)
        if (!timeout) {
          return
        }

        await tasks.schedule('games:autoSubstitutePlayer', timeout.getTime() - Date.now(), {
          gameNumber: game.number,
          player: replacement,
        })
      }),
    )

    events.on(
      'game:playerConnectionStatusUpdated',
      safe(async ({ game, player, playerConnectionStatus }) => {
        if (playerConnectionStatus !== PlayerConnectionStatus.offline) {
          return
        }

        const timeout = await calculateJoinGameserverTimeout(game, player)
        if (!timeout) {
          return
        }

        await tasks.schedule('games:autoSubstitutePlayer', timeout.getTime() - Date.now(), {
          gameNumber: game.number,
          player,
        })
      }),
    )
  },
  {
    name: 'auto substitute players',
    encapsulate: true,
  },
)
