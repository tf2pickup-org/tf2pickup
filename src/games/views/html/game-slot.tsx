import { collections } from '../../../database/collections'
import { type GameSlotModel } from '../../../database/models/game-slot.model'
import { GameState } from '../../../database/models/game.model'
import { Tf2Team } from '../../../shared/types/tf2-team'
import { PlayerConnectionStatusIndicator } from './player-connection-status-indicator'

export async function GameSlot(props: { slot: GameSlotModel; gameState: GameState }) {
  const player = await collections.players.findOne({ _id: props.slot.player })
  if (!player) {
    throw new Error(`no such player: ${props.slot.player.toString()}`)
  }

  const side = props.slot.team === Tf2Team.blu ? 'left' : 'right'

  const showConnectionState = [GameState.launching, GameState.started].includes(props.gameState)
  return (
    <a
      id={`game-slot-${player.steamId}`}
      href={`/players/${player.steamId}`}
      class={['slot', side === 'right' && 'flex-row', side === 'left' && 'flex-row-reverse']}
    >
      <img src={player.avatar.medium} width="38" height="38" alt={`${player.name}'s avatar`} />
      <span class={['flex-1 text-xl font-medium', side === 'left' && 'text-end']} safe>
        {player.name}
      </span>
      {showConnectionState ? (
        <PlayerConnectionStatusIndicator
          steamId={player.steamId}
          connectionStatus={props.slot.connectionStatus}
        />
      ) : (
        <></>
      )}
    </a>
  )
}
