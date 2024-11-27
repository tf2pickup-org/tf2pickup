import fp from 'fastify-plugin'
import { collections } from '../../database/collections'
import { update } from '../update'
import { secondsToMilliseconds } from 'date-fns'
import { events } from '../../events'

async function process() {
  const toRemove = await collections.players.find({ preReadyUntil: { $lte: new Date() } }).toArray()
  for (const p of toRemove) {
    await update(p.steamId, { $unset: { preReadyUntil: 1 } })
  }
}

export default fp(async () => {
  setInterval(process, secondsToMilliseconds(1))

  events.on('game:created', async ({ game }) => {
    for (const slot of game.slots) {
      const player = await collections.players.findOne({ _id: slot.player })
      if (!player) {
        throw new Error(`player ${slot.player.toString()} not found`)
      }

      await update(player.steamId, { $unset: { preReadyUntil: 1 } })
    }
  })
})
