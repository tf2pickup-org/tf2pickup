import type { PlayerModel } from '../../database/models/player.model'
import { IconLogout, IconSettings, IconSettingsFilled, IconUserCircle } from './icons'

export async function Profile(player: PlayerModel) {
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
        import { animate } from "https://cdn.jsdelivr.net/npm/motion@11.11.13/+esm";

        const button = document.getElementById('open-profile-menu-button');
        const profileMenu = document.getElementById('profile-menu');

        const closeProfileMenu = event => {
          const opts = { duration: 0.1, ease: 'easeInOut' };
          animate('#profile-menu-icon-wrapper', { rotate: 0 }, opts);
          animate('#profile-menu-icon', { opacity: 100 }, opts);
          animate('#profile-menu-icon-overlay', { opacity: 0 }, opts);
          animate(profileMenu,  { scaleY: [1, 0] }, opts).then(() => profileMenu.style.display = 'none');
        };

        button.addEventListener('click', event => {
          event.preventDefault();
          if (profileMenu.style.display === 'none') {
            profileMenu.style.display = 'block';
            const opts = { duration: 0.15, ease: 'easeInOut' };
            animate(profileMenu,  { scaleY: [0, 1] }, opts);
            animate('#profile-menu-icon-wrapper', { rotate: 45 }, opts);
            animate('#profile-menu-icon', { opacity: 0 }, opts);
            animate('#profile-menu-icon-overlay', { opacity: 100 }, opts);

            setTimeout(() => document.body.addEventListener('click', closeProfileMenu, { once: true }));
          }
          
        })
      `}</script>
    </>
  )
}
