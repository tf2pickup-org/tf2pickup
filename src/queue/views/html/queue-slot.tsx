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

    const activeBans = await collections.playerBans.countDocuments({
      player: actor._id,
      end: { $gt: new Date() },
    })
    const disabled = Boolean(actor.activeGame) || activeBans > 0
    slotContent = <JoinButton slotId={props.slot.id} disabled={disabled} />
  }

  return (
    <div
      class="queue-slot"
      id={`queue-slot-${props.slot.id}`}
      aria-label={`Queue slot ${props.slot.id}`}
    >
      {slotContent}
    </div>
  )
}

function JoinButton(props: { slotId: number; disabled: boolean }) {
  return (
    <button
      class="join-queue-button"
      name="join"
      value={`${props.slotId}`}
      disabled={props.disabled}
    >
      <span class="sr-only">Join queue on slot {props.slotId}</span>
      {props.disabled ? <IconLock /> : <IconPlus />}
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

  let slotActionButton = <></>
  if (props.actor === props.slot.player && !props.slot.ready) {
    slotActionButton = (
      <button class="leave-queue-button" name="leave" value="">
        <IconMinus />
        <span class="sr-only">Leave queue</span>
      </button>
    )
  } else {
    slotActionButton = <MarkAsFriendButton {...props} />
  }

  return (
    <div class="player-info" data-player-ready={`${props.slot.ready}`}>
      <img src={player.avatar.medium} width="64" height="64" alt={`${player.name}'s name`} />
      <a href={`/players/${player.steamId}`} safe>
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
      />
      <span class="sr-only">Mark as friend</span>
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
