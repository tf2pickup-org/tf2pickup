import { collections } from '../../database/collections'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { liveGameStates } from './live-game-states'
import { syncGameAcl } from './sync-game-acl'

// a replaced player is only in voiceOutgoing, and may be playing another game by now
export async function syncPlayer(player: SteamId64) {
  const games = await collections.games
    .find({
      state: { $in: liveGameStates },
      $or: [{ 'slots.player': player }, { 'slots.voiceOutgoing': player }],
    })
    .toArray()
  for (const game of games) {
    await syncGameAcl(game)
  }
}
