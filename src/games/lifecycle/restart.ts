import { GameEventType } from '../../database/models/game-event.model'
import { GameState, type GameNumber } from '../../database/models/game.model'
import { events } from '../../events'
import { Tf2Team } from '../../shared/types/tf2-team'
import { mutex } from '../mutex'
import { applyTransition } from './apply-transition'

export async function restart(number: GameNumber) {
  const game = await mutex.runExclusive(
    async () =>
      await applyTransition('restart', number, [GameState.started], {
        $set: { score: { [Tf2Team.blu]: 0, [Tf2Team.red]: 0 } },
        $push: { events: { at: new Date(), event: GameEventType.gameRestarted } },
      }),
  )
  if (game) {
    events.emit('game:restarted', { game })
  }
  return game
}
