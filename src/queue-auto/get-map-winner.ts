import { maxBy, sample } from 'es-toolkit'
import { collections } from '../database/collections'
import { logger } from '../logger'
import type { Gamemode } from '../shared/types/gamemode'

export async function getMapWinner(gamemode: Gamemode): Promise<string> {
  const mapsWithVotes = await collections.queueMapOptions
    .aggregate<{ name: string; votes: number }>([
      {
        $match: { gamemode },
      },
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
                  $and: [{ $eq: ['$map', '$$map'] }, { $eq: ['$gamemode', gamemode] }],
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
  logger.trace({ gamemode, mapsWithVotes }, 'queue.getMapWinner()')
  const maxVotes = maxBy(mapsWithVotes, r => r.votes)?.votes ?? 0
  const mapsWithMaxVotes = mapsWithVotes.filter(m => m.votes === maxVotes)
  return sample(mapsWithMaxVotes).name
}
