import { collections } from '../../../database/collections'
import { configuration } from '../../../configuration'
import { PlayerRole, type PlayerModel } from '../../../database/models/player.model'
import type { QueueSlotModel } from '../../../database/models/queue-slot.model'
import { errors } from '../../../errors'
import {
  IconClover,
  IconHeart,
  IconHeartFilled,
  IconLock,
  IconMinus,
  IconPlus,
} from '../../../html/components/icons'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { meetsSkillThreshold } from '../../meets-skill-threshold'
import type { QueueSlotId } from '../../types/queue-slot-id'

const enum MarkAsFriendButtonState {
  none,
  enabled,
  disabled, // marked by another player
  selected, // marked by me
}

export async function QueueSlot(props: { slot: QueueSlotModel; actor?: SteamId64 | undefined }) {
  let slotContent = <></>
  if (props.slot.player) {
    slotContent = <PlayerInfo {...props} />
  } else if (props.actor) {
    const actor = await collections.players.findOne<
      Pick<PlayerModel, 'bans' | 'activeGame' | 'skill' | 'verified'>
    >({ steamId: props.actor }, { projection: { bans: 1, activeGame: 1, skill: 1, verified: 1 } })
    if (!actor) {
      throw errors.internalServerError(`actor invalid: ${props.actor}`)
    }

    const activeBans = actor.bans?.filter(b => b.end.getTime() > new Date().getTime()).length ?? 0
    let disabled: string | undefined = undefined
    if (activeBans > 0) {
      disabled = 'You have active bans'
    } else if (actor.activeGame) {
      disabled = 'You are already in a game'
    } else if (!(await meetsSkillThreshold(actor, props.slot))) {
      disabled = `You do not meet skill requirements to play ${props.slot.gameClass}`
    } else if ((await configuration.get('queue.require_player_verification')) && !actor.verified) {
      disabled = 'You are not verified to join the queue'
    }
    slotContent = <JoinButton slotId={props.slot.id} disabled={disabled} />
  }

  return (
    <div
      class="queue-slot"
      id={`queue-slot-${props.slot.id}`}
      aria-label={`Queue slot ${props.slot.id}`}
      data-player={props.slot.player?.steamId}
    >
      {slotContent}
    </div>
  )
}

function JoinButton(props: { slotId: QueueSlotId; disabled: string | undefined }) {
  return (
    <button
      class="join-queue-button"
      name="join"
      value={props.slotId}
      disabled={!!props.disabled}
      data-umami-event="join-queue"
      data-umami-event-slot-id={props.slotId}
    >
      <span class="sr-only">Join queue on slot {props.slotId}</span>
      {props.disabled ? <IconLock /> : <IconPlus />}
      {!!props.disabled && (
        <span class="tooltip whitespace-nowrap" safe>
          {props.disabled}
        </span>
      )}
    </button>
  )
}

async function PlayerInfo(props: { slot: QueueSlotModel; actor?: SteamId64 | undefined }) {
  if (!props.slot.player) {
    return <></>
  }

  let isFresh = false
  if (props.actor) {
    const actorPlayer = await collections.players.findOne<Pick<PlayerModel, 'roles'>>(
      { steamId: props.actor },
      { projection: { roles: 1 } },
    )
    if (actorPlayer?.roles.includes(PlayerRole.admin)) {
      const slotPlayer = await collections.players.findOne<Pick<PlayerModel, 'skill'>>(
        { steamId: props.slot.player.steamId },
        { projection: { skill: 1 } },
      )
      isFresh = slotPlayer?.skill === undefined
    }
  }

  let slotActionButton: JSX.Element
  if (props.actor === props.slot.player.steamId && !props.slot.ready) {
    slotActionButton = (
      <button class="leave-queue-button" name="leave" value="" data-umami-event="leave-queue">
        <IconMinus />
        <span class="sr-only">Leave queue</span>
        <span class="tooltip">Leave queue</span>
      </button>
    )
  } else {
    slotActionButton = <MarkAsFriendButton {...props} />
  }

  return (
    <div class="player-info" data-player-ready={`${props.slot.ready}`}>
      <img
        src={props.slot.player.avatarUrl}
        width="64"
        height="64"
        alt={`${props.slot.player.name}'s name`}
      />
      <a
        href={`/players/${props.slot.player.steamId}`}
        class="player-name-link"
        preload="mousedown"
      >
        <span class="player-name-text" safe>
          {props.slot.player.name}
        </span>
        {isFresh && (
          <span class="fresh-player-icon">
            <IconClover size={18} />
            <span class="tooltip">No skill assigned</span>
          </span>
        )}
      </a>
      {slotActionButton}
    </div>
  )
}

async function MarkAsFriendButton(props: { slot: QueueSlotModel; actor?: SteamId64 | undefined }) {
  const markAsFriendButtonState = await determineMarkAsFriendButtonState(props.slot, props.actor)
  if (markAsFriendButtonState === MarkAsFriendButtonState.none) {
    return <></>
  }

  return (
    <label class="mark-as-friend-button">
      <input
        type="checkbox"
        id={`mark-as-friend-${props.slot.id}`}
        disabled={markAsFriendButtonState === MarkAsFriendButtonState.disabled}
        checked={markAsFriendButtonState === MarkAsFriendButtonState.selected}
        ws-send
        hx-vals={JSON.stringify({
          markasfriend:
            markAsFriendButtonState === MarkAsFriendButtonState.selected
              ? null
              : props.slot.player!.steamId,
        })}
        hx-trigger="change"
        data-umami-event="mark-as-friend"
        data-umami-event-player={props.slot.player?.steamId}
      />
      <span class="sr-only">Mark as friend</span>
      <span class="tooltip">Mark as friend</span>
      <div class="mark">
        {markAsFriendButtonState === MarkAsFriendButtonState.selected ? (
          <IconHeartFilled />
        ) : (
          <IconHeart />
        )}
      </div>
    </label>
  )
}

async function determineMarkAsFriendButtonState(
  slot: QueueSlotModel,
  actor?: SteamId64,
): Promise<MarkAsFriendButtonState> {
  if (!slot.player) {
    return MarkAsFriendButtonState.none
  }

  if (!actor) {
    return MarkAsFriendButtonState.none
  }

  const actorsSlot = await collections.queueSlots.findOne({ 'player.steamId': actor })
  if (actorsSlot?.canMakeFriendsWith?.includes(slot.gameClass)) {
    const friendship = await collections.queueFriends.findOne({
      target: slot.player.steamId,
    })
    if (friendship === null) {
      return MarkAsFriendButtonState.enabled
    } else if (friendship.source === actor) {
      return MarkAsFriendButtonState.selected
    } else {
      return MarkAsFriendButtonState.disabled
    }
  }

  return MarkAsFriendButtonState.none
}
