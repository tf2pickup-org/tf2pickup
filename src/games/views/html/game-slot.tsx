import { collections } from '../../../database/collections'
import { SlotStatus, type GameSlotModel } from '../../../database/models/game-slot.model'
import { GameState, type GameModel, type GameNumber } from '../../../database/models/game.model'
import { PlayerRole, type PlayerModel } from '../../../database/models/player.model'
import { IconPlus, IconReplaceFilled } from '../../../html/components/icons'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { Tf2Team } from '../../../shared/types/tf2-team'
import { PlayerConnectionStatusIndicator } from './player-connection-status-indicator'

export async function GameSlot(props: {
  game: GameModel
  slot: GameSlotModel
  actor: SteamId64 | undefined
}) {
  const player = await collections.players.findOne({ steamId: props.slot.player })
  if (!player) {
    throw new Error(`no such player: ${props.slot.player.toString()}`)
  }

  const side = props.slot.team === Tf2Team.blu ? 'left' : 'right'

  return (
    <form
      id={`game-slot-${player.steamId}`}
      aria-label={`${player.name}'s slot`}
      class={[
        'slot',
        side === 'right' && 'flex-row',
        side === 'left' && 'flex-row-reverse',
        {
          [SlotStatus.active]: 'active',
          [SlotStatus.waitingForSubstitute]: 'waiting-for-substitute',
        }[props.slot.status],
      ]}
      data-player={player.steamId}
      data-status={props.slot.status}
    >
      <span class="sr-only" safe>
        {player.name}'s slot
      </span>
      <input type="hidden" name="player" value={player.steamId} />
      <GameSlotContent
        game={props.game}
        side={side}
        slot={props.slot}
        player={player}
        actor={props.actor}
      />
    </form>
  )
}

async function GameSlotContent(props: {
  game: GameModel
  side: 'left' | 'right'
  slot: GameSlotModel
  player: PlayerModel
  actor: SteamId64 | undefined
}) {
  const a = props.actor ? await collections.players.findOne({ steamId: props.actor }) : null
  const isAdmin = a?.roles.includes(PlayerRole.admin)

  const showConnectionState = [GameState.launching, GameState.started].includes(props.game.state)
  const showRequestSubstituteButton =
    isAdmin &&
    [GameState.created, GameState.configuring, GameState.launching, GameState.started].includes(
      props.game.state,
    )

  switch (props.slot.status) {
    case SlotStatus.active:
      return (
        <>
          <img
            src={props.player.avatar.medium}
            width="38"
            height="38"
            alt={`${props.player.name}'s avatar`}
          />
          <a
            href={`/players/${props.player.steamId}`}
            class={['flex-1 text-xl font-medium', props.side === 'left' && 'text-end']}
            safe
          >
            {props.player.name}
          </a>

          {showRequestSubstituteButton ? (
            <RequestSubstituteButton number={props.game.number} />
          ) : (
            <></>
          )}

          {showConnectionState ? (
            <PlayerConnectionStatusIndicator
              steamId={props.player.steamId}
              connectionStatus={props.slot.connectionStatus}
            />
          ) : (
            <></>
          )}
        </>
      )

    case SlotStatus.waitingForSubstitute: {
      if (a && (props.slot.player === a.steamId || a.activeGame === undefined)) {
        return (
          <button
            class="flex flex-1 justify-center text-abru-light-60 hover:text-abru-light-70"
            hx-put={`/games/${props.game.number}/replace-player`}
            hx-trigger="click"
            aria-label="Replace player"
          >
            <span class="sr-only">Replace player</span>
            <IconPlus size={32} />
          </button>
        )
      } else {
        return <></>
      }
    }

    default:
      return <></>
  }
}

function RequestSubstituteButton(props: { number: GameNumber }) {
  return (
    <button
      class="rounded-sm bg-abru-light-85 p-2 transition-colors duration-75 hover:bg-abru-light-75"
      hx-put={`/games/${props.number}/request-substitute`}
      hx-trigger="click"
      aria-label="Request substitute"
    >
      <IconReplaceFilled />
    </button>
  )
}
