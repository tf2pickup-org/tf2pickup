import { collections } from '../../database/collections'
import type { PlayerModel } from '../../database/models/player.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export type QueuePageActor = Pick<
  PlayerModel,
  'steamId' | 'hasAcceptedRules' | 'bans' | 'activeGame' | 'skill' | 'verified' | 'roles'
>

export async function fetchActors(steamIds: SteamId64[]): Promise<Map<SteamId64, QueuePageActor>> {
  const actors = await collections.players
    .find<QueuePageActor>(
      { steamId: { $in: steamIds } },
      {
        projection: {
          steamId: 1,
          hasAcceptedRules: 1,
          bans: 1,
          activeGame: 1,
          skill: 1,
          verified: 1,
          roles: 1,
        },
      },
    )
    .toArray()
  return new Map(actors.map(actor => [actor.steamId, actor]))
}
