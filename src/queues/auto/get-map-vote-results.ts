import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'

export async function getMapVoteResults(queue: QueueId): Promise<Record<string, number>> {
  const results = await collections.queueMapOptions
    .aggregate([
      { $match: { queue } },
      {
        $lookup: {
          from: collections.queueMapVotes.collectionName,
          let: { map: '$name' },
          pipeline: [{ $match: { queue } }, { $match: { $expr: { $eq: ['$map', '$$map'] } } }],
          as: 'votes',
        },
      },
      {
        $project: {
          _id: 0,
          mapName: '$name',
          count: { $size: '$votes' },
        },
      },
      {
        $group: {
          _id: null,
          results: {
            $push: {
              k: '$mapName',
              v: '$count',
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          results: { $arrayToObject: '$results' },
        },
      },
      {
        $replaceRoot: { newRoot: '$results' },
      },
    ])
    .toArray()

  return results[0] ?? {}
}
