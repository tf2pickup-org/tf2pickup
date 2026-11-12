import { collections } from '../../database/collections'
import type { PlayerModel } from '../../database/models/player.model'
import type { QueueId } from '../../database/models/queue.model'
import { QueueState } from '../../database/models/queue-state.model'
import { errors } from '../../errors'
import { logger } from '../../logger'
import { preReady } from '../../pre-ready'
import { tasks } from '../../tasks'
import { get } from '../get'
import type { Emit } from './queue-command'

// must run inside queueCommand()
export async function enterState(queue: QueueId, state: QueueState, emit: Emit) {
  logger.info({ queue, state }, 'queue state changed')
  await collections.queueState.updateOne({ queue }, { $set: { state } })

  switch (state) {
    case QueueState.waiting: {
      await cancelTimeouts(queue)
      await collections.queueSlots.updateMany(
        { queue, player: { $ne: null } },
        { $set: { ready: false } },
      )
      const slots = await collections.queueSlots.find({ queue, player: { $ne: null } }).toArray()
      if (slots.length > 0) {
        emit('queue/slots:updated', { queue, slots })
      }
      break
    }

    case QueueState.ready: {
      const last = (await collections.queueState.findOne({ queue }))?.last
      if (!last) {
        throw errors.internalServerError('invalid queue state: last undefined')
      }

      const preReadiedPlayers = await collections.players
        .find<Pick<PlayerModel, 'steamId'>>(
          { preReadyUntil: { $gte: new Date() } },
          { projection: { steamId: 1 } },
        )
        .toArray()
      await collections.queueSlots.updateMany(
        {
          queue,
          'player.steamId': { $in: [...preReadiedPlayers.map(({ steamId }) => steamId), last] },
        },
        { $set: { ready: true } },
      )
      emit('queue/slots:updated', {
        queue,
        slots: await collections.queueSlots.find({ queue, ready: true }).toArray(),
      })
      await preReady.start(last)

      const { readyUpTimeout } = await get(queue)
      await tasks.schedule('queue:readyUpTimeout', readyUpTimeout, { queue })
      break
    }

    case QueueState.launching:
      await cancelTimeouts(queue)
      break
  }

  emit('queue/state:updated', { queue, state })
}

// left over, they would fire into the queue's next ready-up
async function cancelTimeouts(queue: QueueId) {
  await tasks.cancel('queue:readyUpTimeout', { queue })
  await tasks.cancel('queue:unready', { queue })
}
