import { collections } from '../database/collections'
import type { SteamId64 } from '../shared/types/steam-id-64'

export interface GameLaunchesPerDay {
  day: string
  count: number
}

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

export async function getGameLaunchesPerDay(
  since?: Date,
  player?: SteamId64,
): Promise<GameLaunchesPerDay[]> {
  return await collections.games
    .aggregate<GameLaunchesPerDay>([
      {
        $match: {
          ...(since !== undefined && { 'events.0.at': { $gte: since } }),
          ...(player !== undefined && { 'slots.player': player }),
        },
      },
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
