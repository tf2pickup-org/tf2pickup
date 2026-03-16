import { collections } from '../../../database/collections'
import { configuration } from '../../../configuration'
import {
  PlayerRole,
  type PlayerModel,
  type PlayerSkill,
} from '../../../database/models/player.model'
import type { QueueSlotModel } from '../../../database/models/queue-slot.model'
import {
  IconClover,
  IconHeart,
  IconHeartFilled,
  IconLock,
  IconMinus,
  IconPlus,
} from '../../../html/components/icons'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { GameClassIcon } from '../../../html/components/game-class-icon'
import { meetsSkillThreshold } from '../../meets-skill-threshold'
import type { QueueSlotId } from '../../types/queue-slot-id'

const enum MarkAsFriendButtonState {
  none,
  enabled,
  disabled, // marked by another player
  selected, // marked by me
}

type Actor =
  | Pick<PlayerModel, 'steamId' | 'bans' | 'activeGame' | 'skill' | 'verified' | 'roles'>
  | undefined

export async function QueueSlot(props: { slot: QueueSlotModel; actor?: Actor }) {
  let slotContent = <></>
  if (props.slot.player) {
    slotContent = <PlayerInfo {...props} />
  } else if (props.actor) {
    const activeBans =
      props.actor.bans?.filter(b => b.end.getTime() > new Date().getTime()).length ?? 0
    let disabled: string | undefined = undefined
    if (activeBans > 0) {
      disabled = 'You have active bans'
    } else if (props.actor.activeGame) {
      disabled = 'You are already in a game'
    } else if (!(await meetsSkillThreshold(props.actor, props.slot))) {
      disabled = `You do not meet skill requirements to play ${props.slot.gameClass}`
    } else if (
      (await configuration.get('queue.require_player_verification')) &&
      !props.actor.verified
    ) {
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

async function PlayerInfo(props: { slot: QueueSlotModel; actor?: Actor }) {
  if (!props.slot.player) {
    return <></>
  }

  let isAdmin = false
  let skill: PlayerSkill | undefined = undefined
  if (props.actor?.roles.includes(PlayerRole.admin)) {
    const slotPlayer = await collections.players.findOne<Pick<PlayerModel, 'skill'>>(
      { steamId: props.slot.player.steamId },
      { projection: { skill: 1 } },
    )
    isAdmin = true
    skill = slotPlayer?.skill
  }

  let slotActionButton: JSX.Element
  if (props.actor?.steamId === props.slot.player.steamId && !props.slot.ready) {
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

  const skillEntries = isAdmin && skill ? Object.entries(skill) : []

  return (
    <div class="player-info" data-player-ready={`${props.slot.ready}`}>
      <img
        src={props.slot.player.avatarUrl}
        width="64"
        height="64"
        alt={`${props.slot.player.name}'s name`}
        style={`view-transition-name: player-avatar-${props.slot.player.steamId}`}
      />
      <div class="player-name-area">
        <a
          href={`/players/${props.slot.player.steamId}`}
          class="player-name-link"
          preload="mousedown"
        >
          <span class="player-name-text" safe>
            {props.slot.player.name}
          </span>
          {isAdmin && skillEntries.length === 0 && (
            <span class="fresh-player-icon">
              <IconClover size={18} />
            </span>
          )}
        </a>
        {isAdmin && (
          <span class="tooltip">
            {skillEntries.length === 0
              ? 'No skill assigned'
              : skillEntries.map(([className, value], index) => (
                  <>
                    <GameClassIcon gameClass={className as Tf2ClassName} size={16} /> {value}
                    {index < skillEntries.length - 1 && <br />}
                  </>
                ))}
          </span>
        )}
      </div>
      {slotActionButton}
    </div>
  )
}

async function MarkAsFriendButton(props: { slot: QueueSlotModel; actor?: Actor }) {
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
  actor?: Actor,
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
    } else if (friendship.source === actor.steamId) {
      return MarkAsFriendButtonState.selected
    } else {
      return MarkAsFriendButtonState.disabled
    }
  }

  return MarkAsFriendButtonState.none
}
