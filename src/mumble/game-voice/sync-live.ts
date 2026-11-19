import { collections } from '../../database/collections'
import { runningGameStates } from '../../games/lifecycle/running-game-states'
import { syncGameAcl } from './sync-game-acl'

export async function syncLive() {
  const games = await collections.games
    .find({ state: { $in: runningGameStates } }, { projection: { number: 1, state: 1, slots: 1 } })
    .toArray()
  for (const game of games) {
    await syncGameAcl(game)
  }
}
