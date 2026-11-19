import { type GameModel, GameState } from '../../../database/models/game.model'
import { GameLiveIndicator } from '../../../html/components/game-live-indicator'
import { IconX } from '../../../html/components/icons'
import { isRunning } from '../../lifecycle/is-running'

export function GameStateIndicator(props: { game: Pick<GameModel, 'state' | 'number'> }) {
  const gameIsLive = isRunning(props.game)

  let indicator = <></>
  if (gameIsLive) {
    indicator = (
      <>
        <GameLiveIndicator />
        <span class="uppercase">live</span>
      </>
    )
  } else if (props.game.state === GameState.interrupted) {
    indicator = (
      <>
        <IconX size={16} />
        <span>force-ended</span>
      </>
    )
  }

  return (
    <div id={`game-${props.game.number}-state`} class="game-state" aria-label="Game status">
      {indicator}
    </div>
  )
}
