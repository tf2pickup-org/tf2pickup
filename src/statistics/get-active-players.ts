import { collections } from '../database/collections'
import { deletedUserSteamId, type SteamId64 } from '../shared/types/steam-id-64'

export interface ActivePlayer {
  steamId: SteamId64
  /** the most recent game this player was in (its creation time) */
  lastActiveAt: Date
}

/**
 * Distinct players that took part in a game on or after `since`, along with the
 * time of their most recent game. Deleted players are excluded.
 */
export async function getActivePlayers(since: Date): Promise<ActivePlayer[]> {
  return await collections.games
    .aggregate<ActivePlayer>([
      { $match: { 'events.0.at': { $gte: since } } },
      { $unwind: '$slots' },
      { $match: { 'slots.player': { $ne: deletedUserSteamId } } },
      {
        $group: {
          _id: '$slots.player',
          lastActiveAt: { $max: { $arrayElemAt: ['$events.at', 0] } },
        },
      },
      {
        $project: {
          steamId: '$_id',
          lastActiveAt: 1,
          _id: 0,
        },
      },
    ])
    .toArray()
}
