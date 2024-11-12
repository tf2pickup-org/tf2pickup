import fp from 'fastify-plugin'
import { tasks } from '../../tasks'
import { players } from '../../players'
import { configuration } from '../../configuration'
import { collections } from '../../database/collections'
import { events } from '../../events'
import { whenGameEnds } from '../when-game-ends'

export default fp(
  async () => {
    tasks.register('games.freePlayer', async ({ player }) => {
      await players.update(player, { $unset: { activeGame: 1 } })
    })

    events.on(
      'game:updated',
      whenGameEnds(async ({ after }) => {
        await Promise.all(
          after.slots.map(async ({ gameClass, player }) => {
            const p = await collections.players.findOne({ _id: player })
            if (p === null) {
              throw new Error(`player not found: ${player.toString()}`)
            }
            const queueCooldown = await configuration.get('games.join_queue_cooldown')
            const cooldownMs = queueCooldown[gameClass] ?? 0
            tasks.schedule('games.freePlayer', cooldownMs, { player: p.steamId })
          }),
        )
      }),
    )

    events.on('game:playerReplaced', async ({ game, replacee, replacement }) => {
      await players.update(replacement, { $set: { activeGame: game.number } })
      await players.update(replacee, { $unset: { activeGame: 1 } })
    })
  },
  {
    name: 'free players',
  },
)