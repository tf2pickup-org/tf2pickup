import type { PlayerModel } from '../../database/models/player.model'
import { IconSettings } from './icons'

export async function Profile(player: PlayerModel) {
  return (
    <div class="relative grow lg:grow-0">
      <button class="profile-button">
        <img
          src={player.avatar.medium}
          width="64"
          class="h-[42px] w-[42px] rounded-[3px]"
          alt="{name}'s avatar"
        />
        <span class="grow overflow-hidden text-ellipsis whitespace-nowrap text-2xl">
          {player.name}
        </span>
        <div class="relative rotate-0 transition-transform duration-100 group-hover:rotate-45">
          <div class="opacity-100 transition-opacity duration-100">
            <IconSettings />
          </div>
        </div>
      </button>
    </div>
  )
}
