import type { GameModel } from '../../../database/models/game.model'
import type { Tf2Team } from '../../../shared/types/tf2-team'

export async function GameScore(props: { game: GameModel; team: Tf2Team }) {
  return (
    <span
      aria-label={`${props.team} team score`}
      id={`game-${props.game.number}-score-${props.team}`}
      style="grid-area: score"
    >
      {props.game.score?.[props.team] ?? ''}
    </span>
  )
}
