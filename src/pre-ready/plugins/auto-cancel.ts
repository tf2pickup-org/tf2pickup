import fp from 'fastify-plugin'
import { collections } from '../../database/collections'
import { update } from '../../players/update'
import { secondsToMilliseconds } from 'date-fns'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import type { PlayerModel } from '../../database/models/player.model'

async function process() {
  const toRemove = await collections.players
    .find<
      Pick<PlayerModel, 'steamId'>
    >({ preReadyUntil: { $lte: new Date() } }, { projection: { steamId: 1 } })
    .toArray()
  for (const p of toRemove) {
    await update(p.steamId, { $unset: { preReadyUntil: 1 } })
  }
}

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
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
