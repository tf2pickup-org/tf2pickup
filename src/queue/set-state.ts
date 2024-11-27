import { collections } from '../database/collections'
import { QueueState } from '../database/models/queue-state.model'
import { events } from '../events'
import { mutex } from './mutex'

export async function setState(state: QueueState) {
  return await mutex.runExclusive(async () => {
    await collections.queueState.updateOne({}, { $set: { state } })

    if (state === QueueState.ready) {
      const preReadiesPlayers = await collections.players
        .find({ preReadyUntil: { $gte: new Date() } })
        .toArray()
      const toReadyUp = await collections.queueSlots
        .find({ player: { $in: preReadiesPlayers.map(({ steamId }) => steamId) } })
        .toArray()

      const slots = (
        await Promise.all(
          toReadyUp.map(
            async slot =>
              await collections.queueSlots.findOneAndUpdate(
                {
                  player: slot.player,
                },
                {
                  $set: { ready: true },
                },
                { returnDocument: 'after' },
              ),
          ),
        )
      ).filter(slot => slot !== null)
      events.emit('queue/slots:updated', { slots })
    }

    events.emit('queue/state:updated', { state })
  })
}
