import type { GameNumber } from '../../../database/models/game.model'
import { Snackbar } from '../../../html/components/snackbar'

export function RunningGameSnackbar(number: GameNumber) {
  return (
    <Snackbar>
      <div class="flex flex-col items-center gap-6">
        <span>You are involved in a currently running game</span>
        <a href={`/games/${number}`} class="button button--accent">
          Go back to the game
        </a>
      </div>
    </Snackbar>
  )
}
