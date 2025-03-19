import type { GameNumber } from '../../../database/models/game.model'
import { Snackbar } from '../../../html/components/snackbar'

export function RunningGameSnackbar(props: { gameNumber?: GameNumber | undefined }) {
  return (
    <div id="running-game-snackbar">
      {props.gameNumber ? (
        <Snackbar>
          <div class="flex flex-col items-center gap-6">
            <span>You are involved in a currently running game</span>
            <a
              href={`/games/${props.gameNumber}`}
              class="button button--accent"
              preload="mousedown"
            >
              Go back to the game
            </a>
          </div>
        </Snackbar>
      ) : (
        <></>
      )}
    </div>
  )
}
