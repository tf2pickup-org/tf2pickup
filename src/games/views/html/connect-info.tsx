import { GameState, type GameModel } from '../../../database/models/game.model'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { ConnectString } from './connect-string'
import { JoinGameButton } from './join-game-button'
import { JoinVoiceButton } from './join-voice-button'

export function ConnectInfo(props: {
  game: Pick<GameModel, 'number' | 'state' | 'slots' | 'connectString' | 'stvConnectString'>
  actor: SteamId64 | undefined
}) {
  const connectInfoVisible = [
    GameState.created,
    GameState.configuring,
    GameState.launching,
    GameState.started,
  ].includes(props.game.state)

  let connectInfo = <></>
  if (connectInfoVisible) {
    connectInfo = (
      <>
        <UserConnectString game={props.game} actor={props.actor} />
        <JoinGameButton game={props.game} actor={props.actor} />
        <JoinVoiceButton game={props.game} actor={props.actor} />
      </>
    )
  }

  return (
    <div id={`game-${props.game.number}-connect-info`} class="flex flex-col gap-2">
      {connectInfo}
    </div>
  )
}

async function UserConnectString(props: {
  game: Pick<GameModel, 'state' | 'number' | 'slots' | 'connectString' | 'stvConnectString'>
  actor: SteamId64 | undefined
}) {
  let connectString: string | undefined
  let content: string | JSX.Element

  switch (props.game.state) {
    case GameState.created:
      content = <i>waiting for server...</i>
      break
    case GameState.configuring:
      content = <i>configuring server...</i>
      break
    default:
      connectString = actorInGame(props.game, props.actor)
        ? (props.game.connectString ?? '')
        : (props.game.stvConnectString ?? '')
      content = connectString
  }

  return (
    <ConnectString
      gameNumber={props.game.number}
      connectString={connectString}
      ariaLabel="Connect string"
    >
      {content}
    </ConnectString>
  )
}

function actorInGame(game: Pick<GameModel, 'slots'>, actor?: SteamId64) {
  if (!actor) {
    return false
  }

  return game.slots.some(slot => slot.player === actor)
}
