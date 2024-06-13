import { collections } from '../database/collections'

export interface PlayedMapCount {
  mapName: string
  count: number
}

export async function getPlayedMapsCount() {
  return await collections.games
    .aggregate<PlayedMapCount>([
      {
        $project: {
          mapName: { $arrayElemAt: [{ $split: ['$map', '_'] }, 1] },
        },
      },
      { $group: { _id: '$mapName', count: { $sum: 1 } } },
      {
        $project: {
          mapName: '$_id',
          count: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ])
    .toArray()
}
