import type { ObjectId } from 'mongodb'
import { collections } from '../database/collections'
import type { Tf2ClassName } from '../shared/types/tf2-class-name'
import { GameState } from '../database/models/game.model'

type PlayerPlayedClassCount = { [gameClass in Tf2ClassName]?: number }

export async function getPlayerGameCountOnClasses(
  playerId: ObjectId,
): Promise<PlayerPlayedClassCount> {
  return (
    (
      await collections.games
        .aggregate<{ [gameClass in Tf2ClassName]?: number }>([
          {
            $unwind: {
              path: '$slots',
            },
          },
          {
            $match: {
              state: GameState.ended,
              'slots.status': {
                $in: [null, 'active'],
              },
              'slots.player': playerId,
            },
          },
          {
            $group: {
              _id: '$slots.gameClass',
              count: {
                $sum: 1,
              },
            },
          },
          {
            $group: {
              _id: null,
              results: {
                $push: {
                  k: '$_id',
                  v: '$count',
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              results: {
                $arrayToObject: '$results',
              },
            },
          },
          {
            $replaceRoot: {
              newRoot: '$results',
            },
          },
        ])
        .toArray()
    )[0] ?? {}
  )
}
