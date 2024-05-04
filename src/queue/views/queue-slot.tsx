import { PlayerModel } from "../../models/player.model";
import { QueueSlotWithPlayer } from "../pipelines/queue-with-players";

export async function queueSlot(slot: QueueSlotWithPlayer) {
  let slotContent = <></>
  if (slot.player) {
    slotContent = playerInfo(slot.player)
  } else {
    slotContent = joinButton()
  }
  return (
    <div class="queue-slot">
      {slotContent}
    </div>
  )
}

function joinButton() {
  return (<button class="join-queue-button">
    join
  </button>)
}

function playerInfo(player: PlayerModel) {
  return (
    <div class="taken flex flex-1 flex-row items-center justify-center p-2">
      <img
        src={player.avatar.medium}
        width="64"
        height="64"
        alt="{player.name}'s name"
        class="h-[42px] w-[42px] rounded"
      />
      <a
        class="text-abru-dark-3 flex-1 overflow-hidden whitespace-nowrap text-center text-xl font-bold hover:underline"
        href="/players/{player.steamId}">{player.name}</a
      >
      <div class="w-[42px] px-1">

      </div>
    </div>
  )
}