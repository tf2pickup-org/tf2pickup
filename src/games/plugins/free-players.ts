import fp from 'fastify-plugin'
import { tasks } from '../../tasks'
import { players } from '../../players'
import { configuration } from '../../configuration'
import { events } from '../../events'
import { GameEventType, type PlayerReplaced } from '../../database/models/game-event.model'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    tasks.register('games.freePlayer', async ({ player }) => {
      await players.update(player, { $unset: { activeGame: 1 } })
    })

    events.on('game:ended', async ({ game }) => {
      const substitutes = new Set(
        game.events
          .filter(
            (e): e is PlayerReplaced =>
              e.event === GameEventType.playerReplaced && e.replacee !== e.replacement,
          )
          .map(({ replacement }) => replacement),
      )

      await Promise.all(
        game.slots.map(async ({ gameClass, player }) => {
          const queueCooldown = await configuration.get('games.join_queue_cooldown')
          const cooldownMs = substitutes.has(player) ? 0 : queueCooldown[gameClass]
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
