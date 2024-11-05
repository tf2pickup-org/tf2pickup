import { GameState } from '../database/models/game.model'
import type { Events } from '../events'

type EventProps = Events['game:updated']

export function whenGameEnds(fn: (props: EventProps) => Promise<void> | void) {
  return async ({ before, after }: EventProps) => {
    if (
      before.state !== after.state &&
      [GameState.created, GameState.configuring, GameState.launching, GameState.started].includes(
        before.state,
      ) &&
      [GameState.ended, GameState.interrupted].includes(after.state)
    ) {
      await fn({ before, after })
    }
  }
}
