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
    | 'events'
    | 'number'
    | 'gamemode'
    | 'map'
    | 'state'
    | 'connectString'
    | 'stvConnectString'
    | 'slots'
    | 'gameServer'
  >
  actor?: SteamId64 | undefined
}) {
  const launchedAt = props.game.events[0].at
  return (
    <div id={`game-${props.game.number}-summary`} class="game-summary">
      <div class="game-summary-background">
        <MapThumbnail map={props.game.map} />
      </div>

      <div class="flex items-start justify-between gap-2">
        <div class="game-summary-pill">
          <span class="tabular-nums" safe>
            #{props.game.number}
          </span>
          <GameStateIndicator game={props.game} />
        </div>
        <span class="game-summary-pill">{props.game.gamemode}</span>
      </div>

      <div class="flex flex-col gap-3">
        <div class="game-info">
          <span class="game-info-label">map</span>
          <span class="game-info-value" safe>
            {props.game.map}
          </span>
        </div>

        <div class="game-info">
          <span class="game-info-label">launched</span>
          <span class="game-info-value" safe>
            {format(launchedAt, 'PPpp')}
          </span>
        </div>
      </div>

      <div class="flex flex-col gap-[10px]">
        <ConnectInfo game={props.game} actor={props.actor} />
        <LogsLink game={props.game} />
        <DemoLink game={props.game} />
      </div>
    </div>
  )
}
