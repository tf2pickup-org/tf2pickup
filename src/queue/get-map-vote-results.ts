import { collections } from '../database/collections'

export async function getMapVoteResults(): Promise<Record<string, number>> {
  return (
    (
      await collections.queueMapVotes
        .aggregate<Record<string, number>>([
          {
            $group: {
              _id: '$map',
              count: { $sum: 1 },
            },
          },
          {
            $group: {
              _id: null,
              results: {
                $push: { k: '$_id', v: '$count' },
              },
            },
          },
          {
            $project: {
              _id: 0,
              results: { $arrayToObject: '$results' },
            },
          },
          { $replaceRoot: { newRoot: '$results' } },
        ])
        .toArray()
    )[0] ?? {}
  )
}
