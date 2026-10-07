import { Html } from '@kitajs/html'
import { GameState, type GameModel } from '../../../database/models/game.model'
import {
  IconChevronDown,
  IconClick,
  IconEye,
  IconEyeOff,
  IconRefreshDot,
  IconTerminal2,
  IconX,
} from '../../../html/components/icons'
import { ConnectString } from './connect-string'

export function AdminToolbox(props: { game: GameModel }) {
  return (
    <details id="game-admin-toolbox" class="admin-area" data-details-persist="admin-toolbox">
      <summary class="admin-area-summary">
        <span>Admin area</span>
        <IconChevronDown class="admin-area-chevron" />
      </summary>
      <script>
        {
          `try{if(localStorage.getItem('details-persist-admin-toolbox')==='open'){document.currentScript.closest('details').setAttribute('open','');}}catch(e){}` as 'safe'
        }
      </script>

      <div class="game-admin-toolbox admin-area-content">
        <label class="show-assigned-skills-toggle">
          <input type="checkbox" class="sr-only" id="show-assigned-skills" />
          <span class="on">
            <IconEyeOff />
            Hide skills
          </span>
          <span class="off">
            <IconEye />
            Show skills
          </span>
        </label>

        <AdminToolbox.rconConnect {...props} />

        <section class="admin-area-section">
          <h4 class="admin-area-caption">Server actions</h4>
          <AdminToolbox.serverActionButtons {...props} />
        </section>

        <section class="admin-area-section">
          <h4 class="admin-area-caption">Danger zone</h4>
          <AdminToolbox.forceEndButton {...props} />
        </section>
      </div>
    </details>
  )
}

AdminToolbox.gameControlButtons = (props: { game: GameModel }) => (
  <>
    <AdminToolbox.serverActionButtons {...props} />
    <AdminToolbox.forceEndButton {...props} />
  </>
)

AdminToolbox.serverActionButtons = (props: { game: GameModel }) => {
  const disabled = !isRunning(props.game)

  return (
    <>
      <button
        class="button"
        disabled={disabled || !props.game.gameServer}
        id={`game-${props.game.number}-reinitialize-game-server-button`}
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
        id={`game-${props.game.number}-reassign-game-server-button`}
        onclick="htmx.trigger('#choose-game-server-dialog', 'open')"
        data-umami-event="choose-game-server"
        data-umami-event-game-number={props.game.number}
      >
        <IconClick />
        Reassign game server
      </button>

      <button
        class="button"
        disabled={disabled || !props.game.gameServer}
        id={`game-${props.game.number}-rcon-console-button`}
        onclick="htmx.trigger('#rcon-console-dialog', 'open')"
        data-umami-event="open-rcon-console"
        data-umami-event-game-number={props.game.number}
      >
        <IconTerminal2 />
        RCON console
      </button>
    </>
  )
}

AdminToolbox.forceEndButton = (props: { game: GameModel }) => (
  <button
    class="button"
    data-variant="danger"
    disabled={!isRunning(props.game)}
    id={`game-${props.game.number}-force-end-game-button`}
    hx-trigger="click"
    hx-put={`/games/${props.game.number}/force-end`}
    hx-confirm="Are you sure you want to force-end this game?"
    data-umami-event="force-end-game"
    data-umami-event-game-number={props.game.number}
  >
    <IconX />
    Force-end
  </button>
)

AdminToolbox.rconConnect = (props: { game: GameModel }) => {
  const id = `game-${props.game.number}-rcon-connect-string`

  if (
    ![GameState.launching, GameState.started].includes(props.game.state) ||
    !props.game.gameServer
  ) {
    return <div class="hidden" id={id}></div>
  }

  const rconConnect = `rcon_address ${props.game.gameServer.rcon.address}:${props.game.gameServer.rcon.port}; rcon_password "${props.game.gameServer.rcon.password}"`
  return (
    <section class="admin-area-section" id={id}>
      <h4 class="admin-area-caption">RCON</h4>
      <ConnectString
        gameNumber={props.game.number}
        connectString={rconConnect}
        ariaLabel="RCON connect string"
      >
        {Html.escapeHtml(rconConnect)}
      </ConnectString>
    </section>
  )
}

function isRunning(game: Pick<GameModel, 'state'>) {
  return [
    GameState.created,
    GameState.configuring,
    GameState.launching,
    GameState.started,
  ].includes(game.state)
}
