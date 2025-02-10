import { resolve } from 'node:path'
import type { PlayerModel } from '../../database/models/player.model'
import { bundle } from '../bundle'
import { IconLogout, IconSettings, IconSettingsFilled, IconUserCircle } from './icons'

export async function Profile(player: PlayerModel) {
  const animateProfileMenuJs = await bundle(
    resolve(import.meta.dirname, '../@client/animate-profile-menu.ts'),
  )
  return (
    <>
      <div class="relative grow lg:grow-0">
        <button class="profile-button" id="open-profile-menu-button">
          <img
            src={player.avatar.medium}
            width="64"
            class="h-[42px] w-[42px] rounded-[3px]"
            alt="{name}'s avatar"
          />
          <span class="grow overflow-hidden text-ellipsis whitespace-nowrap text-2xl" safe>
            {player.name}
          </span>
          <div
            class="relative transition-transform duration-100 group-hover:rotate-45"
            id="profile-menu-icon-wrapper"
          >
            <div id="profile-menu-icon">
              <IconSettings />
            </div>
            <div
              class="absolute bottom-0 left-0 right-0 top-0 opacity-0"
              id="profile-menu-icon-overlay"
            >
              <IconSettingsFilled size={24} />
            </div>
          </div>
        </button>

        <div
          id="profile-menu"
          class="absolute z-50 mt-2 w-[300px] origin-top rounded-[10px] bg-abru-dark-29 p-2 drop-shadow-xl"
          style="display: none;"
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
            <a
              href="/auth/sign-out"
              class="profile-menu-item profile-menu-item--accent"
              hx-boost="false"
            >
              <IconLogout />
              <span>Sign out</span>
            </a>
          </div>
        </div>
      </div>
      <script type="module">{`
        import { animateProfileMenu } from "${animateProfileMenuJs}";

        const profileMenu = document.getElementById('profile-menu');
        const icon = document.getElementById('profile-menu-icon');
        const iconWrapper = document.getElementById('profile-menu-icon-wrapper');
        const iconOverlay = document.getElementById('profile-menu-icon-overlay');
        const openButton = document.getElementById('open-profile-menu-button');
        animateProfileMenu({ profileMenu, icon, iconWrapper, iconOverlay, openButton });
      `}</script>
    </>
  )
}
