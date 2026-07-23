import { collections } from '../database/collections'
import { QueueState } from '../database/models/queue-state.model'
import { errors } from '../errors'
import { events } from '../events'
import { logger } from '../logger'
import { preReady } from '../pre-ready'
import { withLogLevel } from '../utils/with-log-level'
import { withQueueLock } from './with-queue-lock'

export async function setState(state: QueueState) {
  await withQueueLock('set-state', async () => {
    logger.trace({ state }, 'queue.setState()')

    if (state === QueueState.launching) {
      const notReadyCount = await collections.queueSlots.countDocuments({
        $or: [{ player: { $eq: null } }, { ready: { $eq: false } }],
      })
      if (notReadyCount > 0) {
        throw withLogLevel(
          errors.conflict('cannot launch: queue is no longer full and ready'),
          'warn',
        )
      }
    }

    await collections.queueState.updateOne({}, { $set: { state } })

    if (state === QueueState.ready) {
      const last = (await collections.queueState.findOne())?.last
      if (!last) {
        throw errors.internalServerError('invalid queue state: last undefined')
      }

      const preReadiesPlayers = await collections.players
        .find({ preReadyUntil: { $gte: new Date() } })
        .toArray()
      const toReadyUp = (
        await collections.queueSlots
          .find({ 'player.steamId': { $in: preReadiesPlayers.map(({ steamId }) => steamId) } })
          .toArray()
      ).map(slot => slot.player!.steamId)

      const slots = (
        await Promise.all(
          [...toReadyUp, last].map(
            async player =>
              await collections.queueSlots.findOneAndUpdate(
                { 'player.steamId': player },
                {
                  $set: { ready: true },
                },
                { returnDocument: 'after' },
              ),
          ),
        )
      ).filter(slot => slot !== null)
      events.emit('queue/slots:updated', { slots })
      await preReady.start(last)
    }

    events.emit('queue/state:updated', { state })
  })
}
