import type { GameModel } from '../../../database/models/game.model'

export async function GameScore(props: { game: GameModel }) {
  return (
    <div id={`game-${props.game.number}-score`} class="grid grid-cols-2 gap-[4px]">
      <div class="score-header blu">
        <span class="uppercase">blu</span>
        <span aria-label="blu team score">{props.game.score?.blu ?? ''}</span>
      </div>

      <div class="score-header red">
        <span class="uppercase">red</span>
        <span aria-label="red team score">{props.game.score?.red ?? ''}</span>
      </div>
    </div>
  )
}
