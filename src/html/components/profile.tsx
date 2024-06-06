import type { PlayerModel } from '../../database/models/player.model'
import { IconLogout, IconSettings, IconUserCircle } from './icons'

export async function Profile(player: PlayerModel) {
  return (
    <div class="relative grow lg:grow-0">
      <button
        class="profile-button"
        _="on click halt the event then toggle the *display of #profile-menu"
      >
        <img
          src={player.avatar.medium}
          width="64"
          class="h-[42px] w-[42px] rounded-[3px]"
          alt="{name}'s avatar"
        />
        <span class="grow overflow-hidden text-ellipsis whitespace-nowrap text-2xl" safe>
          {player.name}
        </span>
        <div class="relative rotate-0 transition-transform duration-100 group-hover:rotate-45">
          <div class="opacity-100 transition-opacity duration-100">
            <IconSettings />
          </div>
        </div>
      </button>

      <div
        id="profile-menu"
        class="absolute z-50 mt-2 w-[300px] origin-top rounded-[10px] bg-abru-dark-29 p-2 drop-shadow-xl"
        style="display: none"
        _="on click from <body/> hide me"
      >
        <div class="flex flex-col gap-1 text-abru-light-75">
          <a href={`/players/${player.steamId}`} class="profile-menu-item">
            <IconUserCircle />
            <span>My profile</span>
          </a>
          <div class="divider" />
          <a href="/settings" class="profile-menu-item">
            <IconSettings />
            <span>Settings</span>
          </a>
          <div class="divider" />
          <a href="/auth/sign-out" class="profile-menu-item profile-menu-item--accent">
            <IconLogout />
            <span>Sign out</span>
          </a>
        </div>
      </div>
    </div>
  )
}
