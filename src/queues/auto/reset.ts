import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import type { QueueSlotModel } from '../../database/models/queue-slot.model'
import { QueueState } from '../../database/models/queue-state.model'
import { events } from '../../events'
import { gamemodeConfigs } from '../../gamemodes/configs'
import type { GamemodeConfig } from '../../gamemodes/types/gamemode-config'
import { logger } from '../../logger'
import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import { get } from '../get'
import { getSlots } from './get-slots'
import { getState } from '../get-state'
import { resetMapOptions } from '../../maps/reset-options'

export async function reset(queue: QueueId) {
  logger.trace({ queue }, 'queue.reset()')
  const { gamemode } = await get(queue)
  await collections.queueSlots.deleteMany({ queue })
  await collections.queueSlots.insertMany(generateEmptyQueue(queue, gamemodeConfigs[gamemode]))
  await collections.queueState.updateOne(
    { queue },
    { $set: { state: QueueState.waiting } },
    { upsert: true },
  )
  events.emit('queue/slots:updated', { queue, slots: await getSlots(queue) })
  events.emit('queue/state:updated', { queue, state: await getState(queue) })
  await resetMapOptions(queue)
  logger.info({ queue }, 'queue reset')
}

type EmptyQueueSlot = Omit<QueueSlotModel, 'player'> & { player: null }

function generateEmptyQueue(queue: QueueId, config: GamemodeConfig): EmptyQueueSlot[] {
  const classCounts = Object.fromEntries(Object.keys(Tf2ClassName).map(gc => [gc, 1])) as Record<
    Tf2ClassName,
    number
  >

  return config.classes.flatMap(({ name, count, canMakeFriendsWith }) =>
    Array.from({ length: count * config.teamCount }, () => ({
      queue,
      id: `${name}-${classCounts[name]++}`,
      gameClass: name,
      canMakeFriendsWith: canMakeFriendsWith ?? [],
      player: null,
      ready: false,
    })),
  )
}
