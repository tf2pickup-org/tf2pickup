import { collections } from '../database/collections'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { QueueState } from '../database/models/queue-state.model'
import { events } from '../events'
import { logger } from '../logger'
import type { Gamemode } from '../shared/types/gamemode'
import { Tf2ClassName } from '../shared/types/tf2-class-name'
import { getQueueConfig } from './configs'
import { getSlots } from './get-slots'
import { getState } from '../queue/get-state'
import { resetMapOptions } from '../maps/reset-options'

export async function reset(gamemode: Gamemode) {
  logger.trace({ gamemode }, 'queue.reset()')
  const slots = generateEmptyQueue(gamemode)
  await collections.queueSlots.deleteMany({ gamemode })
  await collections.queueSlots.insertMany(slots)
  await collections.queueState.updateOne(
    { gamemode },
    {
      $set: {
        state: QueueState.waiting,
      },
    },
    {
      upsert: true,
    },
  )
  events.emit('queue/slots:updated', { gamemode, slots: await getSlots(gamemode) })
  events.emit('queue/state:updated', { gamemode, state: await getState(gamemode) })
  await resetMapOptions(gamemode)
  logger.info({ gamemode }, 'queue reset')
}

type EmptyQueueSlot = Omit<QueueSlotModel, 'player'> & { player: null }

function generateEmptyQueue(gamemode: Gamemode): EmptyQueueSlot[] {
  const config = getQueueConfig(gamemode)
  const classCounts = Object.fromEntries(Object.keys(Tf2ClassName).map(gc => [gc, 1])) as Record<
    Tf2ClassName,
    number
  >

  const slots = config.classes.reduce<EmptyQueueSlot[]>((prev, curr) => {
    const classSlots: EmptyQueueSlot[] = []
    for (let i = 0; i < curr.count * config.teamCount; ++i) {
      classSlots.push({
        gamemode,
        id: `${curr.name}-${classCounts[curr.name]++}`,
        gameClass: curr.name,
        canMakeFriendsWith: curr.canMakeFriendsWith ?? [],
        player: null,
        ready: false,
      })
    }

    return prev.concat(classSlots)
  }, [])

  return slots
}
