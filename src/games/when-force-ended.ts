import { GameState } from '../database/models/game.model'
import type { Events } from '../events'

type EventProps = Events['game:updated']

export async function whenForceEnded(
  { before, after }: EventProps,
  fn: (props: EventProps) => Promise<void> | void,
) {
  if (before.state !== after.state && after.state === GameState.interrupted) {
    await fn({ before, after })
  }
}
