import type { GameModel } from '../../../database/models/game.model'
import { IconClick, IconEye, IconRefreshDot, IconX } from '../../../html/components/icons'

export function AdminToolbox(props: { game: GameModel }) {
  return (
    <div class="game-admin-toolbox">
      <button
        class="button"
        hx-trigger="click"
        hx-put={`/games/${props.game.number}/reinitialize-gameserver`}
        hx-confirm="Are you sure you want to reinitialize the game server?"
        data-umami-event="reinitialize-game-server"
        data-umami-event-game-number={props.game.number}
      >
        <IconRefreshDot />
        Reinitialize game server
      </button>

      <button
        class="button"
        onclick="htmx.trigger('#choose-game-server-dialog', 'open')"
        data-umami-event="choose-game-server"
        data-umami-event-game-number={props.game.number}
      >
        <IconClick />
        Reassign game server
      </button>

      <button
        class="button"
        hx-trigger="click"
        hx-put={`/games/${props.game.number}/force-end`}
        hx-confirm="Are you sure you want to force-end this game?"
        data-umami-event="force-end-game"
        data-umami-event-game-number={props.game.number}
      >
        <IconX />
        Force-end
      </button>

      <div class="flex-grow"></div>

      <input type="checkbox" class="button button--accent" checked id="show-assigned-skills">
        <IconEye />
      </input>
    </div>
  )
}
