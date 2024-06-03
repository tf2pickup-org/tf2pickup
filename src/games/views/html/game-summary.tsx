import { format } from 'date-fns'
import { GameEvent } from '../../../database/models/game-event.model'
import { GameState, type GameModel } from '../../../database/models/game.model'
import { GameLiveIndicator } from '../../../html/components/game-live-indicator'
import { MapThumbnail } from '../../../html/components/map-thumbnail'
import { IconX } from '../../../html/components/icons'

export function GameSummary(props: { game: GameModel }) {
  const launchedAt = props.game.events.find(e => e.event === GameEvent.gameCreated)?.at
  if (!launchedAt) {
    throw new Error(`game ${props.game.number} has no 'created' event`)
  }
  let gameState = <></>

  if (
    [GameState.created, GameState.configuring, GameState.launching, GameState.started].includes(
      props.game.state,
    )
  ) {
    gameState = (
      <div class="floating-label text-accent-600 right-[10px] top-[10px]">
        <GameLiveIndicator />
        <span class="uppercase">live</span>
      </div>
    )
  } else if (props.game.state === GameState.interrupted) {
    gameState = (
      <div class="floating-label text-accent-600 right-[10px] top-[10px]">
        <IconX size={18} />
        <span class="text-sm font-bold leading-none">force-ended</span>
      </div>
    )
  }

  return (
    <>
      <div class="text-abru-light-75 flex flex-col overflow-hidden rounded-lg">
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
            <span class="value">{props.game.map}</span>
          </div>
        </div>

        <div class="bg-abru-dark-29 flex flex-col gap-[8px] p-[10px]">
          <div class="game-info">
            <span class="label">launched</span>
            <span class="value">{format(launchedAt, 'dd.MM.yyyy HH:mm')}</span>
          </div>

          {/* {#if $game.logsUrl}
      <GameSummaryLink href={$game.logsUrl}>
        <IconDeviceDesktopAnalytics />logs</GameSummaryLink
      >
    {/if}

    {#if $game.demoUrl}
      <GameSummaryLink href={$game.demoUrl}>
        <IconMovie />demo
      </GameSummaryLink>
    {/if} */}
        </div>
      </div>
    </>
  )
}
