import type { GameNumber } from '../../../database/models/game.model'
import { IconExclamationCircleFilled, IconRefreshDot, IconX } from '../../../html/components/icons'

export function AdminActions(props: { gameNumber: GameNumber }) {
  return (
    <div class="absolute bottom-0 right-0 flex flex-col gap-2">
      <div
        id="admin-actions"
        class="flex flex-col gap-2 rounded-[10px] bg-abru-dark-29 p-2 drop-shadow-2xl"
        style="display: none"
        _="on click from <body/> hide me"
      >
        <button
          class="admin-action-button"
          hx-trigger="click"
          hx-put={`/games/${props.gameNumber}/force-end`}
          hx-confirm="Are you sure you want to force-end this game?"
          data-umami-event="force-end-game"
          data-umami-event-game-number={props.gameNumber}
        >
          <IconX />
          Force-end
        </button>
        <button
          class="admin-action-button"
          hx-trigger="click"
          hx-put={`/games/${props.gameNumber}/reinitialize-gameserver`}
          hx-confirm="Are you sure you want to reinitialize the game server?"
          data-umami-event="reinitialize-game-server"
          data-umami-event-game-number={props.gameNumber}
        >
          <IconRefreshDot />
          Reinitialize game server
        </button>
      </div>

      <button
        class="button button--accent self-end justify-self-end drop-shadow"
        _="on click halt the event then toggle the *display of #admin-actions"
      >
        <span class="sr-only">Admin actions</span>
        <IconExclamationCircleFilled />
      </button>
    </div>
  )
}
