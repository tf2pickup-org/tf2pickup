import { collections } from '../../../database/collections'
import { GameState, type GameModel } from '../../../database/models/game.model'
import {
  IconCopy,
  IconEye,
  IconLoader3,
  IconPlayerPlayFilled,
} from '../../../html/components/icons'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { connectStringToLink } from '../../connect-string-to-link'

export function ConnectInfo(props: { game: GameModel; actor: SteamId64 | undefined }) {
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
        <ConnectString game={props.game} actor={props.actor} />
        <JoinGameButton game={props.game} actor={props.actor} />
      </>
    )
  }

  return (
    <div id={`game-${props.game.number}-connect-info`} class="flex flex-col gap-2">
      {connectInfo}
    </div>
  )
}

async function ConnectString(props: { game: GameModel; actor: SteamId64 | undefined }) {
  let csBoxContent: JSX.Element
  let csBtn = <></>
  switch (props.game.state) {
    case GameState.created:
      csBoxContent = <i>waiting for server...</i>
      break
    case GameState.configuring:
      csBoxContent = <i>configuring server...</i>
      break
    default: {
      const connectString =
        ((await actorInGame(props.game, props.actor))
          ? props.game.connectString
          : props.game.stvConnectString) ?? ''
      csBoxContent = connectString
      csBtn = (
        <button
          class="hover:text-abru-light-85"
          _={`
        on click js
          navigator.clipboard.writeText("${connectString}").then(() => console.log('copied'))
        end
        `}
        >
          <IconCopy size={24} />
          <span class="sr-only">Copy connect string</span>
        </button>
      )
    }
  }

  return (
    <div class="connect-string">
      <div
        class="fade block flex-1 cursor-text select-all overflow-hidden whitespace-nowrap bg-abru-light-5 text-base text-abru-light-75"
        aria-label="Connect string"
        aria-readonly
      >
        {csBoxContent}
      </div>

      {csBtn}
    </div>
  )
}

async function JoinGameButton(props: { game: GameModel; actor: SteamId64 | undefined }) {
  let btnContent: JSX.Element
  let connectLink: string | undefined
  if ([GameState.created, GameState.configuring].includes(props.game.state)) {
    btnContent = <IconLoader3 size={24} class="animate-spin" />
  } else {
    const isInGame = await actorInGame(props.game, props.actor)
    const connectString = (isInGame ? props.game.connectString : props.game.stvConnectString) ?? ''
    connectLink = connectStringToLink(connectString)
    btnContent = isInGame ? (
      <>
        <IconPlayerPlayFilled size={16} />
        join game
      </>
    ) : (
      <>
        <IconEye size={24} />
        watch stv
      </>
    )
  }

  return (
    <a href={connectLink} class="button button--accent join-game-button">
      {btnContent}
    </a>
  )
}

async function actorInGame(game: GameModel, actor?: SteamId64) {
  if (!actor) {
    return false
  }

  const player = await collections.players.findOne({ steamId: actor })
  if (player === null) {
    throw new Error(`player ${actor} does not exist`)
  }

  return game.slots.some(slot => slot.player.equals(player._id))
}
