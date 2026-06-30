import { collections } from '../database/collections'
import type { MapPoolEntry } from '../database/models/map-pool-entry.model'
import { events } from '../events'
import type { Gamemode } from '../shared/types/gamemode'
import { mapPool } from './pool'

export async function resetMapOptions(gamemode: Gamemode) {
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
  await collections.queueMapOptions.deleteMany({ gamemode })
  await collections.queueMapOptions.insertMany(choices.map(({ name }) => ({ gamemode, name })))
  await collections.queueMapVotes.deleteMany({ gamemode })
  events.emit('queue/mapOptions:reset', { gamemode, mapOptions: choices.map(({ name }) => name) })
}
