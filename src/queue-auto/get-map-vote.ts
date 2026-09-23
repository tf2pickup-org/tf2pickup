import { collections } from '../database/collections'
import type { Gamemode } from '../shared/types/gamemode'
import type { SteamId64 } from '../shared/types/steam-id-64'

export async function getMapVote(gamemode: Gamemode, actor: SteamId64 | undefined) {
  if (actor) {
    return (await collections.queueMapVotes.findOne({ gamemode, player: actor }))?.map
  } else {
    return undefined
  }
}
