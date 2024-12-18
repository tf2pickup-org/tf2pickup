import { requestContext } from '@fastify/request-context'
import type { User } from '../../auth/types/user'
import { GamesLink } from './games-link'
import { IconBrandDiscord, IconChartPie, IconCrown, IconHeart } from './icons'
import { IconBrandSteam } from './icons/icon-brand-steam'
import { Profile } from './profile'
import Html from '@kitajs/html'

export function NavigationBar(props: Html.PropsWithChildren<{ user?: User | undefined }>) {
  return (
    <nav class="flex min-h-[95px] flex-row justify-center">
      <div class="container flex flex-row items-center justify-between">
        <a href="/" class="mx-4 self-center md:mx-1">
          <img alt="tf2pickup.org logo" src="/logo.png" height="120" class="h-[44px]" />
        </a>

        <div class="hidden flex-row items-center gap-5 font-medium lg:flex">
          <Menu {...props} />
        </div>
      </div>
    </nav>
  )
}

function Menu(props: Html.PropsWithChildren<{ user?: User | undefined }>) {
  const { user } = props
  let btn = <SteamButton />
  if (user) {
    btn = <Profile {...user.player} />
  }

  return (
    <div class="flex flex-col gap-[10px] px-4 lg:flex-row lg:items-center lg:px-0">
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

      <a
        href="https://discord.gg/UVFVfc4"
        class="hidden text-abru-light-75 hover:text-slate-200 xl:inline-block"
        target="_blank"
      >
        <IconBrandDiscord size={32} />
      </a>

      <a
        href="https://ko-fi.com/tf2pickuporg"
        class="hidden text-abru-light-75 hover:text-slate-200 xl:inline-block"
        target="_blank"
      >
        <IconHeart size={32} />
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
    <a href={href} class="menu-item" aria-current={url === href ? 'page' : undefined}>
      {children}
    </a>
  )
}

function SteamButton() {
  return (
    <a href="/auth/steam" class="steam-button" hx-boost="false">
      <span>Sign in through Steam</span>
      <div class="icon">
        <IconBrandSteam />
      </div>
    </a>
  )
}
