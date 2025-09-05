import { GameState, type GameModel } from '../../../database/models/game.model'
import {
  IconClick,
  IconEye,
  IconEyeOff,
  IconRefreshDot,
  IconX,
} from '../../../html/components/icons'

export function AdminToolbox(props: { game: GameModel }) {
  return (
    <div class="game-admin-toolbox">
      {AdminToolbox.gameControlButtons(props)}

      <div class="flex-grow"></div>

      <label class="show-assigned-skills-checkbox">
        <input type="checkbox" class="button button--accent" id="show-assigned-skills" />
        <div class="icon">
          <div class="on">
            <IconEyeOff />
            <span class="sr-only">Hide sensitive data</span>
          </div>
          <div class="off">
            <IconEye />
            <span class="sr-only">Show sensitive data</span>
          </div>
        </div>
        <span class="tooltip text-nowrap">Toggle sensitive data</span>
      </label>
    </div>
  )
}

AdminToolbox.gameControlButtons = (props: { game: GameModel }) => {
  const disabled = ![
    GameState.created,
    GameState.configuring,
    GameState.launching,
    GameState.started,
  ].includes(props.game.state)

  return (
    <>
      <button
        class="button"
        disabled={disabled}
        id={`game-slot-${props.game.number}-reinitialize-game-server-button`}
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
        disabled={disabled}
        id={`game-slot-${props.game.number}-reassign-game-server-button`}
        onclick="htmx.trigger('#choose-game-server-dialog', 'open')"
        data-umami-event="choose-game-server"
        data-umami-event-game-number={props.game.number}
      >
        <IconClick />
        Reassign game server
      </button>

      <button
        class="button"
        disabled={disabled}
        id={`game-slot-${props.game.number}-force-end-game-button`}
        hx-trigger="click"
        hx-put={`/games/${props.game.number}/force-end`}
        hx-confirm="Are you sure you want to force-end this game?"
        data-umami-event="force-end-game"
        data-umami-event-game-number={props.game.number}
      >
        <IconX />
        Force-end
      </button>
    </>
  )
}
