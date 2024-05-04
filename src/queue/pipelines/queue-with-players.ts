import { PlayerModel } from '../../models/player.model'
import { QueueSlotModel } from '../../models/queue-slot.model'

export const queueWithPlayers = [
  {
    $lookup: {
      from: 'players',
      localField: 'player',
      foreignField: 'steamId',
      as: 'player',
    },
  },
  {
    $addFields: {
      player: {
        $cond: [
          {
            $ne: [
              {
                $size: '$player',
              },
              0,
            ],
          },
          {
            $first: '$player',
          },
          null,
        ],
      },
    },
  },
]

export type QueueSlotWithPlayer = Omit<QueueSlotModel, 'player'> & {
  player: PlayerModel | null
}
