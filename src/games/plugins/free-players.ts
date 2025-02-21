import fp from 'fastify-plugin'
import { tasks } from '../../tasks'
import { players } from '../../players'
import { configuration } from '../../configuration'
import { events } from '../../events'
import { SlotStatus } from '../../database/models/game-slot.model'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    tasks.register('games.freePlayer', async ({ player }) => {
      await players.update(player, { $unset: { activeGame: 1 } })
    })

    events.on('game:ended', async ({ game }) => {
      await Promise.all(
        game.slots
          .filter(slot =>
            [SlotStatus.active, SlotStatus.waitingForSubstitute].includes(slot.status),
          )
          .map(async ({ gameClass, player }) => {
            const queueCooldown = await configuration.get('games.join_queue_cooldown')
            const cooldownMs = queueCooldown[gameClass] ?? 0
            await tasks.schedule('games.freePlayer', cooldownMs, { player })
          }),
      )
    })

    events.on('game:playerReplaced', async ({ game, replacee, replacement }) => {
      await players.update(replacement, { $set: { activeGame: game.number } })
      await players.update(replacee, { $unset: { activeGame: 1 } })
    })
  },
  {
    name: 'free players',
  },
)
