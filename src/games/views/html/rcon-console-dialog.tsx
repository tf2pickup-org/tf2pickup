import type { GameModel } from '../../../database/models/game.model'
import { IconX } from '../../../html/components/icons'

const dialogId = 'rcon-console-dialog'

export function RconConsoleDialog(props: { game: GameModel }) {
  return (
    <dialog
      id={dialogId}
      class="rcon-console"
      hx-on-open={`document.getElementById('${dialogId}').showModal()`}
      hx-on-close={`document.getElementById('${dialogId}').close()`}
    >
      <header>
        <span class="title">RCON console</span>
        {props.game.gameServer && (
          <span class="server" safe>
            {props.game.gameServer.name}
          </span>
        )}
        <button type="button" class="close" onclick="this.closest('dialog').close()">
          <IconX />
          <span class="sr-only">Close</span>
        </button>
      </header>

      <div class="transcript" id="rcon-console-transcript">
        <p class="hint">Commands run as-is on the game server. Try status.</p>
      </div>

      <form
        hx-post={`/games/${props.game.number}/rcon`}
        hx-target="#rcon-console-transcript"
        hx-swap="beforeend scroll:bottom"
        hx-disabled-elt="find input, find button"
        hx-on--after-request="if(event.detail.successful) { this.reset(); this.querySelector('input').focus(); }"
      >
        <span class="prompt" aria-hidden="true">
          ]
        </span>
        <input
          type="text"
          name="command"
          aria-label="RCON command"
          placeholder="status"
          autocomplete="off"
          spellcheck="false"
          maxlength="1024"
          required
          autofocus
        />
        <button
          class="button"
          data-size="dense"
          data-umami-event="execute-rcon-command"
          data-umami-event-game-number={props.game.number}
        >
          Run
        </button>
      </form>
    </dialog>
  )
}

RconConsoleDialog.entry = (props: { command: string; response?: string; error?: string }) => {
  return (
    <div class="entry">
      <span class="command" safe>
        {props.command}
      </span>
      {props.response !== undefined && (
        <span class="response" safe>
          {props.response}
        </span>
      )}
      {props.error !== undefined && (
        <span class="response error" safe>
          {props.error}
        </span>
      )}
    </div>
  )
}
