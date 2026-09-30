import { format } from 'date-fns'
import { GameState, type GameModel } from '../../../database/models/game.model'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { GameLiveIndicator } from '../../../html/components/game-live-indicator'
import { MapThumbnail } from '../../../html/components/map-thumbnail'
import type { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import type { PickDeep } from 'type-fest'

export function GameListItem(props: {
  game: PickDeep<GameModel, 'number' | 'state' | 'events.0' | 'score' | 'map' | 'gamemode'>
  classPlayed?: Tf2ClassName
}) {
  const { game } = props
  const isRunning = [
    GameState.created,
    GameState.configuring,
    GameState.launching,
    GameState.started,
  ].includes(game.state)
  const isCancelled = game.state === GameState.interrupted

  return (
    <a
      class="game-list-item"
      href={`/games/${game.number}`}
      preload="mousedown"
      data-live={isRunning ? 'true' : undefined}
    >
      <div class="game-list-thumbnail">
        <MapThumbnail map={game.map} />
      </div>

      <span class="game-number">
        <span class="live-indicator">{isRunning ? <GameLiveIndicator /> : <></>}</span>
        <span class="tabular-nums" safe>
          #{game.number}
        </span>
      </span>

      <span class="game-list-badge">{game.gamemode}</span>

      {props.classPlayed && <GameClassIcon gameClass={props.classPlayed} size={32} />}

      {isCancelled ? (
        <span class="game-list-badge" data-cancelled>
          cancelled
        </span>
      ) : game.score ? (
        <span class="game-list-score tabular-nums">
          <span data-team="red">{game.score.red}</span>
          <span data-team="blu">{game.score.blu}</span>
        </span>
      ) : (
        <></>
      )}

      <span class="map-name" safe>
        {game.map}
      </span>
      <span class="launched-at" safe>
        {format(game.events[0].at, 'MMM d, yyyy, h:mm a')}
      </span>
    </a>
  )
}
