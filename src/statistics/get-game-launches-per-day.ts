import { collections } from '../database/collections'

export interface GameLaunchesPerDay {
  day: string
  count: number
}

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

export async function getGameLaunchesPerDay(since?: Date): Promise<GameLaunchesPerDay[]> {
  return await collections.games
    .aggregate<GameLaunchesPerDay>([
      ...(since !== undefined
        ? [
            {
              $match: {
                'events.0.at': {
                  $gte: since,
                },
              },
            },
          ]
        : []),
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: {
                $arrayElemAt: ['$events.at', 0],
              },
              timezone,
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          day: '$_id',
          count: 1,
          _id: 0,
        },
      },
    ])
    .toArray()
}
