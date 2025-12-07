import { format } from 'date-fns'
import { type GameModel } from '../../../database/models/game.model'
import { MapThumbnail } from '../../../html/components/map-thumbnail'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { GameStateIndicator } from './game-state-indicator'
import { ConnectInfo } from './connect-info'
import { LogsLink } from './logs-link'
import { DemoLink } from './demo-link'

export function GameSummary(props: {
  game: Pick<
    GameModel,
    'events' | 'number' | 'map' | 'state' | 'connectString' | 'stvConnectString' | 'slots'
  >
  actor?: SteamId64 | undefined
}) {
  const launchedAt = props.game.events[0].at
  return (
    <div
      id={`game-${props.game.number}-summary`}
      class="flex flex-col overflow-hidden rounded-lg text-abru-light-75 xl:mr-4"
      style="grid-area: gameSummary"
    >
      <div class="game-summary-caption relative flex min-h-[200px] flex-1 flex-col justify-end px-[10px]">
        <div class="absolute bottom-0 left-0 right-0 top-0 -z-10">
          <MapThumbnail map={props.game.map} />
        </div>

        <div class="floating-label left-[10px] top-[10px] text-abru-light-75">
          <span safe>#{props.game.number}</span>
        </div>

        <GameStateIndicator game={props.game} />

        <div class="game-info">
          <span class="label">map</span>
          <span class="value" safe>
            {props.game.map}
          </span>
        </div>
      </div>

      <div class="flex flex-col gap-[8px] bg-abru-dark-29 p-[10px]">
        <div class="game-info">
          <span class="label">launched</span>
          <span class="value" safe>
            {format(launchedAt, 'dd.MM.yyyy HH:mm')}
          </span>
        </div>

        <ConnectInfo game={props.game} actor={props.actor} />
        <LogsLink game={props.game} />
        <DemoLink game={props.game} />
      </div>
    </div>
  )
}
