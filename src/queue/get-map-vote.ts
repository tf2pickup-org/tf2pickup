import { collections } from '../database/collections'
import type { SteamId64 } from '../shared/types/steam-id-64'

export async function getMapVote(actor: SteamId64 | undefined) {
  if (actor) {
    return (await collections.queueMapVotes.findOne({ player: actor }))?.map
  } else {
    return undefined
  }
}
