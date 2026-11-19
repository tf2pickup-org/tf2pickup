import { collections } from '../../database/collections'
import { liveGameStates } from './live-game-states'
import { syncGameAcl } from './sync-game-acl'

export async function syncLive() {
  const games = await collections.games
    .find({ state: { $in: liveGameStates } }, { projection: { number: 1, state: 1, slots: 1 } })
    .toArray()
  for (const game of games) {
    await syncGameAcl(game)
  }
}
