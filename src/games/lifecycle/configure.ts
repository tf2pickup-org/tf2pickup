import { GameState, type GameNumber } from '../../database/models/game.model'
import { mutex } from '../mutex'
import { applyTransition } from './apply-transition'
import { runningGameStates } from './running-game-states'

export async function configure(number: GameNumber, logSecret: string) {
  return await mutex.runExclusive(
    async () =>
      await applyTransition('configure', number, runningGameStates, {
        $set: { state: GameState.configuring, logSecret },
        $unset: { connectString: 1, stvConnectString: 1 },
      }),
  )
}
