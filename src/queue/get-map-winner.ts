import { maxBy, sample } from 'lodash-es'
import { collections } from '../database/collections'
import { logger } from '../logger'

export async function getMapWinner(): Promise<string> {
  const mapsWithVotes = await collections.queueMapOptions
    .aggregate<{ name: string; votes: number }>([
      {
        $lookup: {
          from: 'queue.mapvotes',
          let: {
            map: '$name',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$map', '$$map'],
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
  logger.trace({ mapsWithVotes }, 'queue.getMapWinner()')
  const maxVotes = maxBy(mapsWithVotes, r => r.votes)?.votes ?? 0
  const mapsWithMaxVotes = mapsWithVotes.filter(m => m.votes === maxVotes)
  return sample(mapsWithMaxVotes)!.name
}
