import { User } from '../../auth/types/user'
import { PlayerModel } from '../../database/models/player.model'
import { QueueSlotWithPlayer } from '../pipelines/queue-with-players'

export async function QueueSlot(slot: QueueSlotWithPlayer, user?: User) {
  let slotContent = <></>
  if (slot.player) {
    slotContent = playerInfo(slot.player)
  } else if (user?.player) {
    slotContent = joinButton(slot.id)
  }

  return <div class="queue-slot">{slotContent}</div>
}

function joinButton(slotId: number) {
  return (
    <button class="join-queue-button" name="join" value={`${slotId}`}>
      <i class="ti ti-plus text-2xl"></i>
    </button>
  )
}

function playerInfo(player: PlayerModel) {
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
      >
        {player.name}
      </a>
      <div class="w-[42px] px-1"></div>
    </div>
  )
}
