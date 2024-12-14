import { collections } from '../database/collections'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { QueueState } from '../database/models/queue-state.model'
import { events } from '../events'
import { logger } from '../logger'
import { preReady } from '../pre-ready'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { getState } from './get-state'
import { mutex } from './mutex'

export async function join(slotId: number, steamId: SteamId64): Promise<QueueSlotModel[]> {
  return await mutex.runExclusive(async () => {
    logger.trace({ steamId, slotId }, `queue.join()`)
    const player = await collections.players.findOne({ steamId })
    if (!player) {
      throw new Error(`player does not exist: ${steamId}`)
    }

    if (!player.hasAcceptedRules) {
      throw new Error(`player has not accepted rules`)
    }

    if (player.activeGame) {
      throw new Error(`player has active game`)
    }

    const state = await getState()
    if (![QueueState.waiting, QueueState.ready].includes(state)) {
      throw new Error('invalid queue state')
    }

    let targetSlot = await collections.queueSlots.findOne({ id: slotId })
    if (!targetSlot) {
      throw new Error('no such slot')
    }

    if (targetSlot.player) {
      throw new Error('slot occupied')
    }

    const [currentPlayerCount, requiredPlayerCount] = await Promise.all([
      collections.queueSlots.countDocuments({ player: { $ne: null } }),
      collections.queueSlots.countDocuments(),
    ])

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
          ready: requiredPlayerCount - currentPlayerCount <= 1 || state === QueueState.ready,
        },
      },
      {
        returnDocument: 'after',
      },
    )

    const slots = [oldSlot, targetSlot].filter(Boolean) as QueueSlotModel[]
    events.emit('queue/slots:updated', { slots })

    if (targetSlot?.ready) {
      await preReady.start(steamId)
    }

    return slots
  })
}
