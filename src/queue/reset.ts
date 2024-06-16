import { collections } from '../database/collections'
import type { MapPoolEntry } from '../database/models/map-pool-entry.model'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { QueueState } from '../database/models/queue-state.model'
import { events } from '../events'
import { logger } from '../logger'
import { config } from './config'
import { getMapVoteResults } from './get-map-vote-results'
import { getSlots } from './get-slots'
import { getState } from './get-state'
import { mapPool } from './map-pool'

export async function reset() {
  const slots = generateEmptyQueue()
  await collections.queueSlots.deleteMany({})
  await collections.queueSlots.insertMany(slots)
  await collections.queueState.updateOne(
    {},
    {
      $set: {
        state: QueueState.waiting,
      },
    },
    {
      upsert: true,
    },
  )
  events.emit('queue/slots:updated', { slots: await getSlots() })
  events.emit('queue/state:updated', { state: await getState() })
  await resetMapOptions()
  logger.info('queue reset')
}

type EmptyQueueSlot = Omit<QueueSlotModel, 'player'> & { player: null }

function generateEmptyQueue(): EmptyQueueSlot[] {
  let lastId = 0
  const slots = config.classes.reduce<EmptyQueueSlot[]>((prev, curr) => {
    const classSlots: EmptyQueueSlot[] = []
    for (let i = 0; i < curr.count * config.teamCount; ++i) {
      classSlots.push({
        id: lastId++,
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

async function resetMapOptions() {
  if ((await collections.maps.countDocuments()) === 0) {
    await mapPool.reset()
  }

  const choices = await collections.maps
    .aggregate<MapPoolEntry>([
      {
        $match: {
          $or: [
            {
              cooldown: {
                $eq: 0,
              },
            },
            {
              cooldown: {
                $exists: false,
              },
            },
          ],
        },
      },
      { $sample: { size: 3 } },
    ])
    .toArray()
  await collections.queueMapOptions.deleteMany({})
  await collections.queueMapOptions.insertMany(choices.map(({ name }) => ({ name })))
  await collections.queueMapVotes.deleteMany({})
  events.emit('queue/mapOptions:reset', { mapOptions: choices.map(({ name }) => name) })
  const results = await getMapVoteResults()
  events.emit('queue/mapVoteResults:updated', { results })
}
