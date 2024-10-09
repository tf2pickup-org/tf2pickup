import { collections } from '../../../database/collections'
import type { PlayerModel } from '../../../database/models/player.model'
import type { QueueSlotModel } from '../../../database/models/queue-slot.model'
import { IconHeart, IconHeartFilled, IconMinus, IconPlus } from '../../../html/components/icons'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

enum MarkAsFriendButtonState {
  enabled,
  disabled, // marked by another player
  selected, // marked by me
}

export async function QueueSlot(props: { slot: QueueSlotModel; actor?: SteamId64 | undefined }) {
  let slotContent = <></>
  if (props.slot.player) {
    const player = await collections.players.findOne({ steamId: props.slot.player })
    if (!player) {
      throw new Error(`player does not exist: ${props.slot.player}`)
    }

    let markAsFriendButtonState: MarkAsFriendButtonState | undefined = undefined

    if (props.actor) {
      const actorsSlot = await collections.queueSlots.findOne({ player: props.actor })
      if (actorsSlot?.canMakeFriendsWith?.includes(props.slot.gameClass)) {
        const friendship = await collections.queueFriends.findOne({
          target: props.slot.player,
        })
        if (friendship === null) {
          markAsFriendButtonState = MarkAsFriendButtonState.enabled
        } else if (friendship.source === props.actor) {
          markAsFriendButtonState = MarkAsFriendButtonState.selected
        } else {
          markAsFriendButtonState = MarkAsFriendButtonState.disabled
        }
      }
    }

    slotContent = (
      <PlayerInfo
        player={player}
        isActorsSlot={props.actor === props.slot.player}
        ready={props.slot.ready}
        markAsFriendButtonState={markAsFriendButtonState}
      />
    )
  } else if (props.actor) {
    const actor = await collections.players.findOne({ steamId: props.actor })
    if (!actor) {
      throw new Error(`actor invalid: ${props.actor}`)
    }

    const activeBans = await collections.playerBans.countDocuments({
      player: actor._id,
      end: { $gte: new Date() },
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
      aria-label={`Join queue on slot ${props.slotId}`}
      disabled={props.disabled}
    >
      <IconPlus />
    </button>
  )
}

function PlayerInfo(props: {
  player: PlayerModel
  isActorsSlot: boolean
  ready: boolean
  markAsFriendButtonState: MarkAsFriendButtonState | undefined
}) {
  let slotButton = <></>
  if (props.isActorsSlot && !props.ready) {
    slotButton = (
      <button class="leave-queue-button" name="leave" value="" aria-label="Leave queue">
        <IconMinus />
      </button>
    )
  } else if (props.markAsFriendButtonState !== undefined) {
    slotButton = (
      <button
        class={[
          'mark-as-friend-button',
          props.markAsFriendButtonState === MarkAsFriendButtonState.selected && 'selected',
        ]}
        disabled={props.markAsFriendButtonState === MarkAsFriendButtonState.disabled}
        name="markasfriend"
        value={
          props.markAsFriendButtonState === MarkAsFriendButtonState.selected
            ? ''
            : props.player.steamId
        }
        aria-label={
          props.markAsFriendButtonState === MarkAsFriendButtonState.selected
            ? 'Unfriend'
            : 'Mark as friend'
        }
      >
        {props.markAsFriendButtonState === MarkAsFriendButtonState.selected ? (
          <IconHeartFilled />
        ) : (
          <IconHeart />
        )}
      </button>
    )
  }

  return (
    <div
      class={[
        'flex flex-1 flex-row items-center justify-center p-2',
        !props.isActorsSlot && !props.ready && 'taken',
        props.isActorsSlot && 'my-slot',
        props.ready && 'ready',
      ]}
    >
      <img
        src={props.player.avatar.medium}
        width="64"
        height="64"
        alt={`${props.player.name}'s name`}
        class="h-[42px] w-[42px] rounded"
      />
      <a
        class="flex-1 overflow-hidden whitespace-nowrap text-center text-xl font-bold text-abru-dark-3 hover:underline"
        href={`/players/${props.player.steamId}`}
        safe
      >
        {props.player.name}
      </a>
      <div class="w-[42px] px-1">{slotButton}</div>
    </div>
  )
}
