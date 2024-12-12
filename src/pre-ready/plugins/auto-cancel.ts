import fp from 'fastify-plugin'
import { collections } from '../../database/collections'
import { update } from '../../players/update'
import { secondsToMilliseconds } from 'date-fns'
import { events } from '../../events'
import { safe } from '../../utils/safe'

async function process() {
  const toRemove = await collections.players.find({ preReadyUntil: { $lte: new Date() } }).toArray()
  for (const p of toRemove) {
    await update(p.steamId, { $unset: { preReadyUntil: 1 } })
  }
}

export default fp(
  async () => {
    setInterval(process, secondsToMilliseconds(1))

    events.on(
      'game:created',
      safe(async ({ game }) => {
        await Promise.all(
          game.slots.map(
            async ({ player }) => await update(player, { $unset: { preReadyUntil: 1 } }),
          ),
        )
      }),
    )
  },
  {
    name: 'auto cancel pre-ready up',
  },
)
