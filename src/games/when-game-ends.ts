import { GameState } from '../database/models/game.model'
import type { Events } from '../events'

type EventProps = Events['game:updated']

export async function whenGameEnds(
  { before, after }: EventProps,
  fn: (props: EventProps) => Promise<void> | void,
) {
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
