import type { GameNumber } from '../../../database/models/game.model'
import { IconExclamationCircleFilled, IconRefreshDot, IconX } from '../../../html/components/icons'

export function AdminActions(props: { gameNumber: GameNumber }) {
  return (
    <div class="absolute bottom-0 right-0 flex flex-col gap-2">
      <div
        id="admin-actions"
        class="flex flex-col bg-abru-dark-29 rounded-[10px] p-2 gap-2 drop-shadow-2xl"
        style="display: none"
        _="on click from <body/> hide me"
      >
        <button
          class="admin-action-button"
          hx-trigger="click"
          hx-put={`/games/${props.gameNumber}/force-end`}
          hx-confirm="Are you sure you want to force-end this game?"
        >
          <IconX />
          Force-end
        </button>
        <button class="admin-action-button">
          <IconRefreshDot />
          Reinitialize game server
        </button>
      </div>

      <button
        class="button button--accent justify-self-end drop-shadow self-end"
        _="on click halt the event then toggle the *display of #admin-actions"
      >
        <span class="sr-only">Admin actions</span>
        <IconExclamationCircleFilled />
      </button>
    </div>
  )
}
