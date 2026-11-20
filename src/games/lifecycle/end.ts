import { GameEndedReason } from '../../database/models/game-event.model'
import { GameState, type GameNumber } from '../../database/models/game.model'
import { finish } from './finish'

export async function end(number: GameNumber) {
  return await finish(
    'end',
    number,
    [GameState.started],
    GameState.ended,
    GameEndedReason.matchEnded,
  )
}
