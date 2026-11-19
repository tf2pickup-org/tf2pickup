import { GameEventType } from '../../database/models/game-event.model'
import { GameState, type GameNumber } from '../../database/models/game.model'
import { Tf2Team } from '../../shared/types/tf2-team'
import { mutex } from '../mutex'
import { applyTransition } from './apply-transition'

export async function start(number: GameNumber) {
  return await mutex.runExclusive(
    async () =>
      await applyTransition('start', number, [GameState.launching], {
        $set: { state: GameState.started, score: { [Tf2Team.blu]: 0, [Tf2Team.red]: 0 } },
        $push: { events: { at: new Date(), event: GameEventType.gameStarted } },
      }),
  )
}
