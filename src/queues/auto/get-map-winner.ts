import { maxBy, sample } from 'es-toolkit'
import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { logger } from '../../logger'

export async function getMapWinner(queue: QueueId): Promise<string> {
  const mapsWithVotes = await collections.queueMapOptions
    .aggregate<{ name: string; votes: number }>([
      { $match: { queue } },
      {
        $lookup: {
          from: 'queue.mapvotes',
          let: {
            map: '$name',
            queue: '$queue',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$map', '$$map'] }, { $eq: ['$queue', '$$queue'] }],
                },
              },
            },
          ],
          as: 'votes',
        },
      },
      {
        $project: {
          _id: 0,
          name: 1,
          votes: {
            $size: '$votes',
          },
        },
      },
    ])
    .toArray()
  logger.trace({ queue, mapsWithVotes }, 'queue.getMapWinner()')
  const maxVotes = maxBy(mapsWithVotes, r => r.votes)?.votes ?? 0
  const mapsWithMaxVotes = mapsWithVotes.filter(m => m.votes === maxVotes)
  return sample(mapsWithMaxVotes).name
}
