import { User } from '../auth/types/user'
import { Profile } from './profile'

export function NavigationBar(props: Html.PropsWithChildren<{ user?: User | undefined }>) {
  return (
    <nav class="flex h-[95px] flex-row justify-center">
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
      <MenuItem href="/games">Games</MenuItem>
      <MenuItem href="/players">Players</MenuItem>
      <MenuItem href="/rules">Rules</MenuItem>

      <MenuItem href="/hall-of-fame">
        <i class="ti ti-crown text-2xl"></i>
        HOF
      </MenuItem>

      <MenuItem href="/statistics">
        <i class="ti ti-chart-pie text-2xl"></i>
        Stats
      </MenuItem>

      <div class="hidden w-8 xl:block" />

      <a
        href="https://discord.gg/UVFVfc4"
        class="text-abru-light-75 hidden hover:text-slate-200 xl:inline-block"
        target="_blank"
      >
        <i class="ti ti-brand-discord text-4xl"></i>
      </a>

      <a
        href="https://ko-fi.com/tf2pickuporg"
        class="text-abru-light-75 hidden hover:text-slate-200 xl:inline-block"
        target="_blank"
      >
        <i class="ti ti-heart text-4xl"></i>
      </a>

      <div class="hidden w-2 lg:block" />
      <div class="bg-abru-light-15 my-2 h-[2px] grow lg:hidden" />

      {btn}
    </div>
  )
}

function MenuItem({ href, children }: Html.PropsWithChildren<{ href: string }>) {
  return (
    <a href={href} class="menu-item">
      {children}
    </a>
  )
}

function SteamButton() {
  return (
    <a href="/auth/steam" class="steam-button" hx-boost="false">
      <span>Sign in through Steam</span>
      <div class="icon">
        <i class="ti ti-brand-steam"></i>
      </div>
    </a>
  )
}
