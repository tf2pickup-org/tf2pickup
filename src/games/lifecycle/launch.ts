import { GameEventType } from '../../database/models/game-event.model'
import { GameState, type GameNumber } from '../../database/models/game.model'
import { events } from '../../events'
import { mutex } from '../mutex'
import { applyTransition } from './apply-transition'

export async function launch(
  number: GameNumber,
  { connectString, stvConnectString }: { connectString: string; stvConnectString: string },
) {
  const game = await mutex.runExclusive(
    async () =>
      await applyTransition('launch', number, [GameState.configuring], {
        $set: { connectString, stvConnectString, state: GameState.launching },
        $push: { events: { event: GameEventType.gameServerInitialized, at: new Date() } },
      }),
  )
  if (game) {
    events.emit('game:gameServerInitialized', { game })
  }
  return game
}
