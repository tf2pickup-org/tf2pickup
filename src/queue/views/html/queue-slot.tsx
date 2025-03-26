import { collections } from '../../../database/collections'
import type { QueueSlotModel } from '../../../database/models/queue-slot.model'
import {
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
    const actor = await collections.players.findOne({ steamId: props.actor })
    if (!actor) {
      throw new Error(`actor invalid: ${props.actor}`)
    }

    const activeBans = actor.bans?.filter(b => b.end.getTime() > new Date().getTime()).length ?? 0
    let disabled: string | undefined = undefined
    if (activeBans > 0) {
      disabled = 'You have active bans'
    } else if (actor.activeGame) {
      disabled = 'You are already in a game'
    } else if (!(await meetsSkillThreshold(actor, props.slot))) {
      disabled = `You do not meet skill requirements to play ${props.slot.gameClass}`
    }
    slotContent = <JoinButton slotId={props.slot.id} disabled={disabled} />
  }

  return (
    <div
      class="queue-slot"
      id={`queue-slot-${props.slot.id}`}
      aria-label={`Queue slot ${props.slot.id}`}
      data-player={props.slot.player}
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

  const player = await collections.players.findOne({ steamId: props.slot.player })
  if (!player) {
    throw new Error(`player does not exist: ${props.slot.player}`)
  }

  let slotActionButton: JSX.Element
  if (props.actor === props.slot.player && !props.slot.ready) {
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
      <img src={player.avatar.medium} width="64" height="64" alt={`${player.name}'s name`} />
      <a href={`/players/${player.steamId}`} preload="mousedown" safe>
        {player.name}
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
              : props.slot.player!,
        })}
        hx-trigger="change"
        data-umami-event="mark-as-friend"
        data-umami-event-player={props.slot.player}
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

  const actorsSlot = await collections.queueSlots.findOne({ player: actor })
  if (actorsSlot?.canMakeFriendsWith?.includes(slot.gameClass)) {
    const friendship = await collections.queueFriends.findOne({
      target: slot.player,
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
