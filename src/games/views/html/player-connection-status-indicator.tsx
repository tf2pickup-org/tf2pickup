import {
  PlayerConnectionStatus,
  SlotStatus,
  type GameSlotModel,
} from '../../../database/models/game-slot.model'
import { GameState, type GameModel } from '../../../database/models/game.model'

export function PlayerConnectionStatusIndicator(props: {
  game: Pick<GameModel, 'state'>
  slot: Pick<GameSlotModel, 'player' | 'status' | 'connectionStatus'>
}) {
  if (
    props.slot.status !== SlotStatus.active ||
    ![GameState.launching, GameState.started].includes(props.game.state)
  ) {
    return <></>
  }

  return (
    <div
      id={`player-${props.slot.player}-connection-status`}
      aria-label="Player connection status"
      class={[
        'player-connection-status',
        {
          [PlayerConnectionStatus.connected]: 'connected',
          [PlayerConnectionStatus.joining]: 'joining',
          [PlayerConnectionStatus.offline]: 'offline',
        }[props.slot.connectionStatus],
      ]}
    >
      <span class="sr-only">Player is {props.slot.connectionStatus}</span>
    </div>
  )
}
