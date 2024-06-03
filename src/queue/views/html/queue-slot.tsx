import { collections } from '../../../database/collections'
import type { PlayerModel } from '../../../database/models/player.model'
import type { QueueSlotModel } from '../../../database/models/queue-slot.model'
import { IconMinus, IconPlus } from '../../../html/components/icons'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

export async function QueueSlot(props: { slot: QueueSlotModel; actor?: SteamId64 | undefined }) {
  let slotContent = <></>
  if (props.slot.player) {
    const player = await collections.players.findOne({ steamId: props.slot.player })
    if (!player) {
      throw new Error(`player does not exist: ${props.slot.player}`)
    }
    slotContent = (
      <PlayerInfo
        player={player}
        isActorsSlot={props.actor === props.slot.player}
        ready={props.slot.ready}
      />
    )
  } else if (props.actor) {
    slotContent = JoinButton(props.slot.id)
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

function JoinButton(slotId: number) {
  return (
    <button
      class="join-queue-button"
      name="join"
      value={`${slotId}`}
      aria-label={`Join queue on slot ${slotId}`}
    >
      <IconPlus />
    </button>
  )
}

function PlayerInfo(props: { player: PlayerModel; isActorsSlot: boolean; ready: boolean }) {
  let leaveButton = <></>
  if (props.isActorsSlot) {
    leaveButton = (
      <button class="leave-queue-button" name="leave" value="">
        <IconMinus />
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
        class="text-abru-dark-3 flex-1 overflow-hidden whitespace-nowrap text-center text-xl font-bold hover:underline"
        href={`/players/${props.player.steamId}`}
        safe
      >
        {props.player.name}
      </a>
      <div class="w-[42px] px-1">{leaveButton}</div>
    </div>
  )
}
