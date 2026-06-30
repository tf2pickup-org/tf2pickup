import { collections } from '../database/collections'
import type { Gamemode } from '../shared/types/gamemode'

export async function getMapVoteResults(gamemode: Gamemode): Promise<Record<string, number>> {
  const results = await collections.queueMapOptions
    .aggregate([
      {
        $match: { gamemode },
      },
      {
        $lookup: {
          from: collections.queueMapVotes.collectionName,
          let: { map: '$name' },
          pipeline: [
            {
              $match: {
                $expr: { $and: [{ $eq: ['$map', '$$map'] }, { $eq: ['$gamemode', gamemode] }] },
              },
            },
          ],
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
