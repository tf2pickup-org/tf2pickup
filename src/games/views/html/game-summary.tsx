import { format } from 'date-fns'
import { GameEventType } from '../../../database/models/game-event.model'
import { GameState, type GameModel } from '../../../database/models/game.model'
import { GameLiveIndicator } from '../../../html/components/game-live-indicator'
import { MapThumbnail } from '../../../html/components/map-thumbnail'
import {
  IconCopy,
  IconDeviceDesktopAnalytics,
  IconMovie,
  IconX,
} from '../../../html/components/icons'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { collections } from '../../../database/collections'

export function GameSummary(props: { game: GameModel; actor?: SteamId64 | undefined }) {
  const launchedAt = props.game.events.find(e => e.event === GameEventType.gameCreated)?.at
  if (!launchedAt) {
    throw new Error(`game ${props.game.number} has no 'created' event`)
  }
  let gameState = <></>
  let connectInfo = <></>

  if (gameIsLive(props.game.state)) {
    gameState = (
      <div class="floating-label text-accent-600 right-[10px] top-[10px]" aria-label="Game status">
        <GameLiveIndicator />
        <span class="uppercase">live</span>
      </div>
    )
    connectInfo = <GameConnectInfo game={props.game} />
  } else if (props.game.state === GameState.interrupted) {
    gameState = (
      <div class="floating-label text-accent-600 right-[10px] top-[10px]" aria-label="Game status">
        <IconX size={18} />
        <span class="text-sm font-bold leading-none">force-ended</span>
      </div>
    )
  }

  let logsLink = <></>
  if (props.game.logsUrl) {
    logsLink = (
      <a href={props.game.logsUrl} target="_blank" class="game-summary-link">
        <IconDeviceDesktopAnalytics />
        logs
      </a>
    )
  }

  let demoLink = <></>
  if (props.game.demoUrl) {
    demoLink = (
      <a href={props.game.demoUrl} target="_blank" class="game-summary-link">
        <IconMovie />
        demo
      </a>
    )
  }

  return (
    <div
      id={`game-${props.game.number}-summary`}
      class="text-abru-light-75 flex flex-col overflow-hidden rounded-lg"
    >
      <div class="game-summary-caption relative flex min-h-[200px] flex-1 flex-col justify-end px-[10px]">
        <div class="absolute bottom-0 left-0 right-0 top-0 -z-10">
          <MapThumbnail map={props.game.map} />
        </div>

        <div class="floating-label text-abru-light-75 left-[10px] top-[10px]">
          <span>#{props.game.number}</span>
        </div>

        {gameState}

        <div class="game-info">
          <span class="label">map</span>
          <span class="value" safe>
            {props.game.map}
          </span>
        </div>
      </div>

      <div class="bg-abru-dark-29 flex flex-col gap-[8px] p-[10px]">
        <div class="game-info">
          <span class="label">launched</span>
          <span class="value" safe>
            {format(launchedAt, 'dd.MM.yyyy HH:mm')}
          </span>
        </div>

        {connectInfo}
        {logsLink}
        {demoLink}
      </div>
    </div>
  )
}

function gameIsLive(gameState: GameState) {
  return [
    GameState.created,
    GameState.configuring,
    GameState.launching,
    GameState.started,
  ].includes(gameState)
}

function GameConnectInfo(props: { game: GameModel }) {
  return (
    <div class="flex flex-col gap-2">
      <ConnectString game={props.game} />
    </div>
  )
}

async function ConnectString(props: { game: GameModel; actor?: SteamId64 | undefined }) {
  const playerId = (async (steamId?: SteamId64) => {
    if (!steamId) {
      return undefined
    }

    const player = await collections.players.findOne({ steamId })
    if (player === null) {
      throw new Error(`player ${steamId} does not exist`)
    }

    return player
  })(props.actor)

  let csBoxContent: JSX.Element
  let csBtn = <></>
  switch (props.game.state) {
    case GameState.created:
      csBoxContent = <i>waiting for server...</i>
      break
    case GameState.configuring:
      csBoxContent = <i>configuring server...</i>
      break
    default: {
      const connectString =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        (props.game.slots.some(slot => slot.player.equals(playerId))
          ? props.game.connectString
          : props.game.stvConnectString) ?? ''
      csBoxContent = connectString
      csBtn = (
        <button
          class="hover:text-abru-light-85"
          _={`
      on click js
        navigator.clipboard.writeText("${connectString}").then(() => console.log('copied'))
      end
      `}
        >
          <IconCopy size={24} />
        </button>
      )
    }
  }

  return (
    <div class="connect-string">
      <div
        class="fade block flex-1 cursor-text select-all overflow-hidden whitespace-nowrap bg-abru-light-5 text-base text-abru-light-75"
        aria-readonly
      >
        {csBoxContent}
      </div>

      {csBtn}
    </div>
  )
}
