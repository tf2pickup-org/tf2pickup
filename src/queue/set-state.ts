import { collections } from '../database/collections'
import { QueueState } from '../database/models/queue-state.model'
import { errors } from '../errors'
import { events } from '../events'
import { logger } from '../logger'
import { preReady } from '../pre-ready'
import type { Gamemode } from '../shared/types/gamemode'
import { withQueueLock } from './with-queue-lock'

export async function setState(gamemode: Gamemode, state: QueueState) {
  await withQueueLock(gamemode, 'set-state', async () => {
    logger.trace({ gamemode, state }, 'queue.setState()')
    await collections.queueState.updateOne({ gamemode }, { $set: { state } })

    if (state === QueueState.ready) {
      const last = (await collections.queueState.findOne({ gamemode }))?.last
      if (!last) {
        throw errors.internalServerError('invalid queue state: last undefined')
      }

      const preReadiesPlayers = await collections.players
        .find({ preReadyUntil: { $gte: new Date() } })
        .toArray()
      const toReadyUp = (
        await collections.queueSlots
          .find({
            gamemode,
            'player.steamId': { $in: preReadiesPlayers.map(({ steamId }) => steamId) },
          })
          .toArray()
      ).map(slot => slot.player!.steamId)

      const slots = (
        await Promise.all(
          [...toReadyUp, last].map(
            async player =>
              await collections.queueSlots.findOneAndUpdate(
                { gamemode, 'player.steamId': player },
                {
                  $set: { ready: true },
                },
                { returnDocument: 'after' },
              ),
          ),
        )
      ).filter(slot => slot !== null)
      events.emit('queue/slots:updated', { gamemode, slots })
      await preReady.start(last)
    }

    events.emit('queue/state:updated', { gamemode, state })
  })
}
