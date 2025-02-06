import {
  PlayerConnectionStatus,
  SlotStatus,
  type GameSlotModel,
} from '../../../database/models/game-slot.model'
import { GameState, type GameModel } from '../../../database/models/game.model'
import { IconEye, IconLoader3, IconPlayerPlayFilled } from '../../../html/components/icons'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { connectStringToLink } from '../../connect-string-to-link'

export async function JoinGameButton(props: { game: GameModel; actor: SteamId64 | undefined }) {
  return (
    <div class="contents" id={`game-${props.game.number}-join-game-button`}>
      <JoinGameButtonContent {...props} />
    </div>
  )
}

async function JoinGameButtonContent(props: { game: GameModel; actor: SteamId64 | undefined }) {
  let btnContent: JSX.Element
  let connectLink: string | undefined
  if ([GameState.created, GameState.configuring].includes(props.game.state)) {
    btnContent = (
      <>
        <IconLoader3 size={24} class="animate-spin" />
        <span class="sr-only">Waiting for server...</span>
      </>
    )
  } else {
    const slot = getPlayerSlot(props.game, props.actor)
    const connectString = (slot ? props.game.connectString : props.game.stvConnectString) ?? ''
    connectLink = connectStringToLink(connectString)
    btnContent = slot ? <JoinAsPlayer slot={slot} /> : <JoinAsSpectator />
  }

  return (
    <a href={connectLink} class="button button--accent join-game-button">
      {btnContent}
    </a>
  )
}

async function JoinAsPlayer(props: { slot: GameSlotModel }) {
  let timeLeftMs = 0

  if (props.slot.connectionStatus === PlayerConnectionStatus.offline) {
    timeLeftMs = Math.max(
      props.slot.shouldJoinBy ? props.slot.shouldJoinBy.getTime() - Date.now() : 0,
      0,
    )
  }

  if (timeLeftMs > 0) {
    const minutes = Math.floor(timeLeftMs / 60000)
    const seconds = ((timeLeftMs % 60000) / 1000).toFixed(0)
    return (
      <>
        <IconPlayerPlayFilled size={16} />
        join in{' '}
        <span data-countdown={timeLeftMs} safe>
          {minutes}:{seconds.length === 1 ? '0' : ''}
          {seconds}
        </span>
      </>
    )
  } else {
    return (
      <>
        <IconPlayerPlayFilled size={16} />
        join game
      </>
    )
  }
}

async function JoinAsSpectator() {
  return (
    <>
      <IconEye size={24} />
      watch stv
    </>
  )
}

function getPlayerSlot(game: GameModel, actor?: SteamId64) {
  if (!actor) {
    return undefined
  }

  return game.slots
    .filter(({ status }) => [SlotStatus.active, SlotStatus.waitingForSubstitute].includes(status))
    .find(({ player }) => player === actor)
}
