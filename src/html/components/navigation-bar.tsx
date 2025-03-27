import { requestContext } from '@fastify/request-context'
import type { User } from '../../auth/types/user'
import { GamesLink } from './games-link'
import { IconBrandDiscord, IconChartPie, IconCrown, IconHeart, IconMenu2 } from './icons'
import { IconBrandSteam } from './icons/icon-brand-steam'
import { Profile } from './profile'
import Html from '@kitajs/html'
import { configuration } from '../../configuration'

export function NavigationBar(props: Html.PropsWithChildren<{ user?: User | undefined }>) {
  return (
    <nav class="flex min-h-[95px] flex-row justify-center">
      <div class="container flex flex-row items-center justify-between">
        <a href="/" class="mx-4 self-center md:mx-1">
          <img alt="tf2pickup.org logo" src="/logo.png" height="120" class="h-[44px]" />
        </a>

        <div class="hidden flex-row items-center gap-5 font-medium lg:flex" id="navbar-menu">
          <Menu {...props} />
        </div>

        <button class="mx-4 text-ash lg:hidden" id="toggle-menu-button">
          <IconMenu2 size={42} />
        </button>

        <script type="module">{`
        document.getElementById('toggle-menu-button').addEventListener('click', () => {
          document.getElementById('navbar-menu').classList.toggle('hidden');
        });
      `}</script>
      </div>
    </nav>
  )
}

async function Menu(props: Html.PropsWithChildren<{ user?: User | undefined }>) {
  const { user } = props
  let btn = <SteamButton />
  if (user) {
    btn = <Profile {...user.player} />
  }

  const discordInvite = await configuration.get('misc.discord_invite_link')

  return (
    <div class="absolute left-0 top-0 flex flex-col gap-[10px] px-4 lg:static lg:flex-row lg:items-center lg:px-0">
      <GamesLink />
      <MenuItem href="/players">Players</MenuItem>
      <MenuItem href="/rules">Rules</MenuItem>

      <MenuItem href="/hall-of-fame">
        <IconCrown />
        HOF
      </MenuItem>

      <MenuItem href="/statistics">
        <IconChartPie />
        Stats
      </MenuItem>

      <div class="hidden w-8 xl:block" />

      {discordInvite !== null && (
        <a
          href={discordInvite}
          class="hidden text-abru-light-75 hover:text-slate-200 xl:inline-block"
          target="_blank"
          data-umami-event="social-discord"
        >
          <IconBrandDiscord size={32} />
          <span class="tooltip tooltip--bottom whitespace-nowrap">Join us on Discord!</span>
        </a>
      )}

      <a
        href="https://ko-fi.com/tf2pickuporg"
        class="hidden text-abru-light-75 hover:text-slate-200 xl:inline-block"
        target="_blank"
        data-umami-event="social-kofi"
      >
        <IconHeart size={32} />
        <span class="tooltip tooltip--bottom whitespace-nowrap">Support us on Ko-fi!</span>
      </a>

      <div class="hidden w-2 lg:block" />
      <div class="my-2 h-[2px] grow bg-abru-light-15 lg:hidden" />

      {btn}
    </div>
  )
}

function MenuItem({ href, children }: Html.PropsWithChildren<{ href: string }>) {
  const url = requestContext.get('url')
  return (
    <a
      href={href}
      class="menu-item"
      aria-current={url === href ? 'page' : undefined}
      preload="mousedown"
    >
      {children}
    </a>
  )
}

function SteamButton() {
  return (
    <a href="/auth/steam" class="steam-button" hx-boost="false" data-umami-event="login-steam">
      <span>Sign in through Steam</span>
      <div class="icon">
        <IconBrandSteam />
      </div>
    </a>
  )
}
