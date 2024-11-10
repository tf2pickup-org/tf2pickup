import fp from 'fastify-plugin'
import { events } from '../../events'
import { configuration } from '../../configuration'
import { tasks } from '../../tasks'
import { requestSubstitute } from '../request-substitute'
import { PlayerConnectionStatus, SlotStatus } from '../../database/models/game-slot.model'
import { collections } from '../../database/collections'
import { whenGameEnds } from '../when-game-ends'
import { calculateJoinGameserverTimeout } from '../calculate-join-gameserver-timeout'

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

    events.on('game:gameServerInitialized', async ({ game }) => {
      const joinTimeout = await configuration.get('games.join_gameserver_timeout')
      if (joinTimeout === 0) {
        return
      }

      const players = await Promise.all(
        game.slots
          .filter(slot => slot.status === SlotStatus.active)
          .map(async slot => {
            const player = await collections.players.findOne({ _id: slot.player })
            if (!player) {
              throw new Error(`player not found: ${slot.player}`)
            }

            return player.steamId
          }),
      )
      players.forEach(player => {
        tasks.schedule('games:autoSubstitutePlayer', joinTimeout, {
          gameNumber: game.number,
          player,
        })
      })
    })

    events.on('game:playerReplaced', async ({ game, replacement }) => {
      const timeout = await calculateJoinGameserverTimeout(game, replacement)
      if (!timeout) {
        return
      }

      tasks.schedule('games:autoSubstitutePlayer', timeout.getTime() - Date.now(), {
        gameNumber: game.number,
        player: replacement,
      })
    })

    events.on(
      'game:playerConnectionStatusUpdated',
      async ({ game, player, playerConnectionStatus }) => {
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
      },
    )
  },
  {
    name: 'auto substitute players',
    encapsulate: true,
  },
)
