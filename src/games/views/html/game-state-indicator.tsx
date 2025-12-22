import { type GameModel, GameState } from '../../../database/models/game.model'
import { GameLiveIndicator } from '../../../html/components/game-live-indicator'
import { IconX } from '../../../html/components/icons'

export function GameStateIndicator(props: { game: Pick<GameModel, 'state' | 'number'> }) {
  const gameIsLive = [
    GameState.created,
    GameState.configuring,
    GameState.launching,
    GameState.started,
  ].includes(props.game.state)

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
        <IconX size={18} />
        <span class="text-sm leading-none font-bold">force-ended</span>
      </>
    )
  }

  return (
    <div
      id={`game-${props.game.number}-state`}
      class="floating-label text-accent-600 top-[10px] right-[10px]"
      aria-label="Game status"
    >
      {indicator}
    </div>
  )
}
