import { format } from 'date-fns'
import { GameState, type GameModel } from '../../../database/models/game.model'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { GameLiveIndicator } from '../../../html/components/game-live-indicator'
import { MapThumbnail } from '../../../html/components/map-thumbnail'
import type { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import type { PickDeep } from 'type-fest'
import type { GameResult } from '../../game-result'
import { isRunning } from '../../lifecycle/is-running'

const resultLetters: Record<GameResult, string> = {
  win: 'W',
  loss: 'L',
  tie: 'T',
  interrupted: 'X',
}

export function GameListItem(props: {
  game: PickDeep<GameModel, 'number' | 'state' | 'events.0' | 'score' | 'map' | 'gamemode'>
  classPlayed?: Tf2ClassName
  // the result for the player whose history this is
  result?: GameResult | undefined
}) {
  const { game } = props
  const running = isRunning(game)
  const isCancelled = game.state === GameState.interrupted

  return (
    <a
      class="game-list-item"
      href={`/games/${game.number}`}
      preload="mousedown"
      data-live={running ? 'true' : undefined}
      data-result={props.result}
    >
      <div class="game-list-thumbnail">
        <MapThumbnail map={game.map} />
      </div>

      {props.result && (
        <span class="game-list-result" title={props.result} safe>
          {resultLetters[props.result]}
        </span>
      )}

      <span class="game-number">
        <span class="live-indicator">{running ? <GameLiveIndicator /> : <></>}</span>
        <span class="tabular-nums" safe>
          #{game.number}
        </span>
      </span>

      <span class="game-list-badge">{game.gamemode}</span>

      {props.classPlayed && (
        <span class="game-list-class">
          <GameClassIcon gameClass={props.classPlayed} size={24} />
        </span>
      )}

      {isCancelled ? (
        <span class="game-list-badge game-list-status" data-cancelled>
          cancelled
        </span>
      ) : game.score ? (
        <span class="game-list-score game-list-status tabular-nums">
          <span data-team="blu" aria-label="BLU score">
            {game.score.blu}
          </span>
          <span data-team="red" aria-label="RED score">
            {game.score.red}
          </span>
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
