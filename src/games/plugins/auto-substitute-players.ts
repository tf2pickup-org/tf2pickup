import fp from 'fastify-plugin'
import { events } from '../../events'
import { configuration } from '../../configuration'
import { tasks } from '../../tasks'
import { requestSubstitute } from '../request-substitute'
import { PlayerConnectionStatus, SlotStatus } from '../../database/models/game-slot.model'
import { whenGameEnds } from '../when-game-ends'
import { calculateJoinGameserverTimeout } from '../calculate-join-gameserver-timeout'
import { safe } from '../../utils/safe'

export default fp(
  async () => {
    tasks.register('games:autoSubstitutePlayer', async ({ gameNumber, player }) => {
      await requestSubstitute({
        number: gameNumber,
        replacee: player,
        actor: 'bot',
        reason: 'Player is offline',
      })
    })

    events.on(
      'game:updated',
      whenGameEnds(({ after }) => {
        tasks.cancel('games:autoSubstitutePlayer', { gameNumber: after.number })
      }),
    )

    events.on('match/player:connected', ({ gameNumber, steamId }) => {
      tasks.cancel('games:autoSubstitutePlayer', { gameNumber, player: steamId })
    })

    events.on('game:substituteRequested', ({ game, replacee }) => {
      tasks.cancel('games:autoSubstitutePlayer', { gameNumber: game.number, player: replacee })
    })

    events.on(
      'game:gameServerInitialized',
      safe(async ({ game }) => {
        const joinTimeout = await configuration.get('games.join_gameserver_timeout')
        if (joinTimeout <= 0) {
          return
        }

        game.slots
          .filter(slot => slot.status === SlotStatus.active)
          .map(({ player }) => player)
          .forEach(player => {
            tasks.schedule('games:autoSubstitutePlayer', joinTimeout, {
              gameNumber: game.number,
              player,
            })
          })
      }),
    )

    events.on(
      'game:playerReplaced',
      safe(async ({ game, replacement }) => {
        const timeout = await calculateJoinGameserverTimeout(game, replacement)
        if (!timeout) {
          return
        }

        tasks.schedule('games:autoSubstitutePlayer', timeout.getTime() - Date.now(), {
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

        tasks.schedule('games:autoSubstitutePlayer', timeout.getTime() - Date.now(), {
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
