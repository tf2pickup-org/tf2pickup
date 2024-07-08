import { PlayerConnectionStatus } from '../../../database/models/game-slot.model'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

export function PlayerConnectionStatusIndicator(props: {
  steamId: SteamId64
  connectionStatus: PlayerConnectionStatus
}) {
  return (
    <div
      id={`player-${props.steamId}-connection-status`}
      aria-label="Player connection status"
      class={[
        '-m-1 w-[6px] self-stretch rounded',
        {
          [PlayerConnectionStatus.connected]: 'connected',
          [PlayerConnectionStatus.joining]: 'joining',
          [PlayerConnectionStatus.offline]: 'offline',
        }[props.connectionStatus],
      ]}
    >
      <span class="sr-only">Player is {props.connectionStatus}</span>
    </div>
  )
}
