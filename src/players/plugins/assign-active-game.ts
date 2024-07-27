import fp from 'fastify-plugin'
import { events } from '../../events'
import { update } from '../update'
import { collections } from '../../database/collections'
import { GameState } from '../../database/models/game.model'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('game:created', async ({ game }) => {
      await Promise.all(
        game.slots.map(async ({ player }) => {
          const p = await collections.players.findOne({ _id: player })
          if (p === null) {
            throw new Error(`player not found: ${player.toString()}`)
          }
          await update(p.steamId, { $set: { activeGame: game.number } })
        }),
      )
    })

    events.on('game:updated', async ({ before, after }) => {
      if (
        before.state !== after.state &&
        [GameState.ended, GameState.interrupted].includes(after.state)
      ) {
        await Promise.all(
          after.slots.map(async ({ player }) => {
            const p = await collections.players.findOne({ _id: player })
            if (p === null) {
              throw new Error(`player not found: ${player.toString()}`)
            }
            await update(p.steamId, { $unset: { activeGame: 1 } })
          }),
        )
      }
    })

    events.on('game:playerReplaced', async ({ game, replacee, replacement }) => {
      await update(replacement, { $set: { activeGame: game.number } })
      await update(replacee, { $unset: { activeGame: 1 } })
    })
  },
  { name: 'assign active game' },
)
