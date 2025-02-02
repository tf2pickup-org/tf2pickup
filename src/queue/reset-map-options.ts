import { collections } from '../database/collections'
import type { MapPoolEntry } from '../database/models/map-pool-entry.model'
import { events } from '../events'
import { getMapVoteResults } from './get-map-vote-results'
import { mapPool } from './map-pool'

export async function resetMapOptions() {
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
