import { collections } from '../../../database/collections'
import { PlayerModel } from '../../../database/models/player.model'
import { QueueSlotModel } from '../../../database/models/queue-slot.model'
import { SteamId64 } from '../../../shared/types/steam-id-64'

export async function QueueSlot(props: { slot: QueueSlotModel; actor?: SteamId64 | undefined }) {
  let slotContent = <></>
  if (props.slot.player) {
    const player = await collections.players.findOne({ steamId: props.slot.player })
    if (!player) {
      throw new Error(`player does not exist: ${props.slot.player}`)
    }
    slotContent = PlayerInfo(player, props.actor === props.slot.player)
  } else if (props.actor) {
    slotContent = JoinButton(props.slot.id)
  }

  return (
    <div class="queue-slot" id={`queue-slot-${props.slot.id}`}>
      {slotContent}
    </div>
  )
}

function JoinButton(slotId: number) {
  return (
    <button class="join-queue-button" name="join" value={`${slotId}`}>
      <i class="ti ti-plus text-2xl"></i>
    </button>
  )
}

function PlayerInfo(player: PlayerModel, renderLeaveButton: boolean) {
  let leaveButton = <></>
  if (renderLeaveButton) {
    leaveButton = (
      <button class="leave-queue-button" name="leave" value="">
        <i class="ti ti-minus text-2xl"></i>
      </button>
    )
  }

  return (
    <div class="taken flex flex-1 flex-row items-center justify-center p-2">
      <img
        src={player.avatar.medium}
        width="64"
        height="64"
        alt={`${player.name}'s name`}
        class="h-[42px] w-[42px] rounded"
      />
      <a
        class="text-abru-dark-3 flex-1 overflow-hidden whitespace-nowrap text-center text-xl font-bold hover:underline"
        href={`/players/${player.steamId}`}
        safe
      >
        {player.name}
      </a>
      <div class="w-[42px] px-1">{leaveButton}</div>
    </div>
  )
}
