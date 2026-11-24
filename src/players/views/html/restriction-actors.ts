import { collections } from '../../../database/collections'
import type { PlayerBan, PlayerModel } from '../../../database/models/player.model'
import { isBot } from '../../../shared/types/bot'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

export async function restrictionActors(
  restrictions: PlayerBan[],
): Promise<Map<SteamId64, Pick<PlayerModel, 'name' | 'steamId'>>> {
  const steamIds = [
    ...new Set(restrictions.map(r => r.actor).filter((a): a is SteamId64 => !isBot(a))),
  ]
  const actors = await collections.players
    .find<Pick<PlayerModel, 'name' | 'steamId'>>(
      { steamId: { $in: steamIds } },
      { projection: { name: 1, steamId: 1 } },
    )
    .toArray()
  return new Map(actors.map(actor => [actor.steamId, actor]))
}
