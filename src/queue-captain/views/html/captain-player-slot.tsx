import { collections } from '../../../database/collections'
import type { PlayerModel } from '../../../database/models/player.model'
import type { QueuePlayerModel } from '../../../database/models/queue-player.model'
import { IconCrown, IconMinus, IconPlus, IconX } from '../../../html/components/icons'
import type { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

export async function CaptainClassColumn(props: {
  gameClass: Tf2ClassName
  players: QueuePlayerModel[]
  actor?: SteamId64 | undefined
}) {
  const { gameClass, players, actor } = props
  const inClass = players.filter(p => p.offeredClasses.includes(gameClass))

  const actorInClass = actor ? inClass.some(p => p.steamId === actor) : false

  return (
    <div class="captain-class-column" id={`captain-class-column-${gameClass}`}>
      {await Promise.all(inClass.map(p => CaptainPlayerSlot({ player: p, actor, gameClass })))}
      <CaptainJoinButton gameClass={gameClass} actor={actor} alreadyIn={actorInClass} />
    </div>
  )
}

async function CaptainPlayerSlot(props: {
  player: QueuePlayerModel
  actor?: SteamId64 | undefined
  gameClass: Tf2ClassName
}) {
  const { player, actor, gameClass } = props

  const profile = await collections.players.findOne<
    Pick<PlayerModel, 'steamId' | 'name' | 'avatar'>
  >({ steamId: player.steamId }, { projection: { steamId: 1, name: 1, avatar: 1 } })

  if (!profile) return <></>

  const isMe = actor === player.steamId

  return (
    <div class="player-info" data-player-ready={`${player.ready}`} data-steamid={player.steamId}>
      <img src={profile.avatar.medium} width="64" height="64" alt={`${profile.name}'s avatar`} />
      <div class="player-name-area">
        <a href={`/players/${player.steamId}`} class="player-name-link" preload="mousedown">
          <span class="player-name-text" safe>
            {profile.name}
          </span>
          {player.wantsCaptain && (
            <span class="captain-wish-icon" title="Wants to be captain">
              <IconCrown size={16} />
            </span>
          )}
        </a>
      </div>
      {isMe ? (
        <button
          class="leave-queue-button"
          name="captainLeave"
          value={gameClass}
          ws-send
          title={
            player.offeredClasses.length === 1
              ? 'Leave queue'
              : `Remove ${gameClass} from your classes`
          }
        >
          {player.offeredClasses.length === 1 ? <IconMinus /> : <IconX size={16} />}
          <span class="sr-only">
            {player.offeredClasses.length === 1 ? 'Leave queue' : `Remove ${gameClass}`}
          </span>
        </button>
      ) : (
        <div class="w-[34px]" />
      )}
    </div>
  )
}

function CaptainJoinButton(props: {
  gameClass: Tf2ClassName
  actor?: SteamId64 | undefined
  alreadyIn: boolean
}) {
  if (!props.actor || props.alreadyIn) return <></>

  return (
    <button
      class="join-queue-button"
      name="captainJoin"
      value={props.gameClass}
      ws-send
      data-umami-event="captain-join-class"
      data-umami-event-class={props.gameClass}
    >
      <IconPlus />
      <span class="sr-only">Join as {props.gameClass}</span>
    </button>
  )
}
