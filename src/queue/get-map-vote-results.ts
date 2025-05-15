import { collections } from '../database/collections'

export async function getMapVoteResults(): Promise<Record<string, number>> {
  const results = await collections.queueMapOptions
    .aggregate([
      {
        $lookup: {
          from: collections.queueMapVotes.collectionName,
          localField: 'name',
          foreignField: 'map',
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
