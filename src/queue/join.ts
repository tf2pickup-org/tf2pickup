import { collections } from '../database/collections'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { QueueState } from '../database/models/queue-state.model'
import { errors } from '../errors'
import { events } from '../events'
import { logger } from '../logger'
import { players } from '../players'
import { preReady } from '../pre-ready'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { getState } from './get-state'
import { meetsSkillThreshold } from './meets-skill-threshold'
import { mutex } from './mutex'
import type { QueueSlotId } from './types/queue-slot-id'

export async function join(slotId: QueueSlotId, steamId: SteamId64): Promise<QueueSlotModel[]> {
  return await mutex.runExclusive(async () => {
    logger.trace({ steamId, slotId }, `queue.join()`)
    const player = await players.bySteamId(steamId)

    if (!player.hasAcceptedRules) {
      throw errors.badRequest(`player has not accepted rules`)
    }

    if (player.activeGame) {
      throw errors.badRequest(`player has active game`)
    }

    const state = await getState()
    if (![QueueState.waiting, QueueState.ready].includes(state)) {
      throw errors.badRequest('invalid queue state')
    }

    let targetSlot = await collections.queueSlots.findOne({ id: slotId })
    if (!targetSlot) {
      throw errors.notFound('no such slot')
    }

    if (targetSlot.player) {
      throw errors.badRequest('slot occupied')
    }

    if (!(await meetsSkillThreshold(player, targetSlot))) {
      throw errors.badRequest(`player does not meet skill threshold`)
    }

    const oldSlot = await collections.queueSlots.findOneAndUpdate(
      {
        player: player.steamId,
      },
      {
        $set: { player: null, ready: false },
      },
      {
        returnDocument: 'after',
      },
    )

    targetSlot = await collections.queueSlots.findOneAndUpdate(
      { _id: targetSlot._id },
      {
        $set: {
          player: player.steamId,
          ready: state === QueueState.ready,
        },
      },
      {
        returnDocument: 'after',
      },
    )

    await collections.queueState.updateOne({}, { $set: { last: player.steamId } })

    const slots = [oldSlot, targetSlot].filter(Boolean) as QueueSlotModel[]
    events.emit('queue/slots:updated', { slots })

    if (targetSlot?.ready) {
      await preReady.start(steamId)
    }

    return slots
  })
}
