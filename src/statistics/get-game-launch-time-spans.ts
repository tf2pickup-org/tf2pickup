import { collections } from '../database/collections'

type TimeOfTheDay =
  | 'morning' /* 06-12 */
  | 'afternoon' /* 12-18 */
  | 'evening' /* 18-24 */
  | 'night' /* 24-06 */

export interface GameLaunchTimeSpan {
  dayOfWeek: number // day of the week as a number between 1 (Sunday) and 7 (Saturday)
  timeOfTheDay: TimeOfTheDay
  count: number
}

export async function getGameLaunchTimeSpans(): Promise<GameLaunchTimeSpan[]> {
  const timezone = process.env['TZ'] ?? 'GMT'
  return await collections.games
    .aggregate<GameLaunchTimeSpan>([
      {
        $project: {
          dayOfWeek: {
            $dayOfWeek: {
              date: {
                $arrayElemAt: ['$events.at', 0],
              },
              timezone,
            },
          },
          timeOfTheDay: {
            $switch: {
              branches: [
                {
                  case: {
                    $in: [
                      {
                        $hour: {
                          date: {
                            $arrayElemAt: ['$events.at', 0],
                          },
                          timezone,
                        },
                      },
                      [6, 7, 8, 9, 10, 11],
                    ],
                  },
                  then: 'morning',
                },
                {
                  case: {
                    $in: [
                      {
                        $hour: {
                          date: {
                            $arrayElemAt: ['$events.at', 0],
                          },
                          timezone,
                        },
                      },
                      [12, 13, 14, 15, 16, 17],
                    ],
                  },
                  then: 'afternoon',
                },
                {
                  case: {
                    $in: [
                      {
                        $hour: {
                          date: {
                            $arrayElemAt: ['$events.at', 0],
                          },
                          timezone,
                        },
                      },
                      [18, 19, 20, 21, 22, 23],
                    ],
                  },
                  then: 'evening',
                },
                {
                  case: {
                    $in: [
                      {
                        $hour: {
                          date: {
                            $arrayElemAt: ['$events.at', 0],
                          },
                          timezone,
                        },
                      },
                      [0, 1, 2, 3, 4, 5],
                    ],
                  },
                  then: 'night',
                },
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: {
            dayOfWeek: '$dayOfWeek',
            timeOfTheDay: '$timeOfTheDay',
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          dayOfWeek: '$_id.dayOfWeek',
          timeOfTheDay: '$_id.timeOfTheDay',
          count: 1,
          _id: 0,
        },
      },
    ])
    .toArray()
}
