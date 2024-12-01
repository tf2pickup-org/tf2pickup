import { format } from 'date-fns'
import { GameState, type GameModel } from '../../../database/models/game.model'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { GameLiveIndicator } from '../../../html/components/game-live-indicator'
import { MapThumbnail } from '../../../html/components/map-thumbnail'
import type { Tf2ClassName } from '../../../shared/types/tf2-class-name'

export function GameListItem(props: { game: GameModel; classPlayed?: Tf2ClassName }) {
  const isRunning = [
    GameState.created,
    GameState.configuring,
    GameState.launching,
    GameState.started,
  ].includes(props.game.state)

  const launchedAt = props.game.events[0]?.at
  if (!launchedAt) throw new Error('game has no events')

  let gameLabel = <div class="col-span-2"></div>
  if (props.game.state === GameState.interrupted) {
    gameLabel = <div class="label label--interrupted">force-ended</div>
  } else if (props.game.score?.blu !== undefined) {
    gameLabel = (
      <>
        <div class="label label--blu">blu: {props.game.score.blu}</div>
        <div class="label label--red">red: {props.game.score.red}</div>
      </>
    )
  } else if (
    [GameState.created, GameState.configuring, GameState.launching].includes(props.game.state)
  ) {
    gameLabel = <div class="label label--launching">{props.game.state}</div>
  }

  return (
    <a class="game-list-item" href={`/games/${props.game.number}`}>
      <div class="live-indicator">{isRunning ? <GameLiveIndicator /> : <></>}</div>
      <span class={['game-number', isRunning && 'text-accent']} safe>
        #{props.game.number}
      </span>
      <span class="map-name" safe>
        {props.game.map}
      </span>
      <span class="launched-at" safe>
        {format(launchedAt, 'dd.MM.yyyy HH:mm')}
      </span>

      <div class="game-class-icon">
        {props.classPlayed && <GameClassIcon gameClass={props.classPlayed} size={32} />}
      </div>

      {gameLabel}

      <div class="absolute bottom-0 left-0 right-0 top-0 -z-10 overflow-hidden rounded-lg xl:left-1/3">
        <MapThumbnail map={props.game.map} />
      </div>
    </a>
  )
}
