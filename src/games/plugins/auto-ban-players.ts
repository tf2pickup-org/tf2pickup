import fp from 'fastify-plugin'
import { events } from '../../events'
import { configuration } from '../../configuration'
import { tasks } from '../../tasks'
import { requestSubstitute } from '../request-substitute'
import { SlotStatus } from '../../database/models/game-slot.model'
import { collections } from '../../database/collections'

export default fp(
  async () => {
    tasks.register('games:autoSubstitutePlayer', async (gameNumber, player) => {
      await requestSubstitute({
        number: gameNumber,
        replacee: player,
        actor: 'bot',
        reason: 'Player is offline',
      })
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
        tasks.schedule('games:autoSubstitutePlayer', joinTimeout, game.number, player)
      })
    })

    events.on('match/player:connected', ({ gameNumber, steamId }) => {
      tasks.cancel('games:autoSubstitutePlayer', gameNumber, steamId)
    })
  },
  {
    name: 'auto ban players',
    encapsulate: true,
  },
)
