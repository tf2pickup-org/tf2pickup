import type { PlayerModel } from '../../../database/models/player.model'
import { IconBrandDiscord } from '../../../html/components/icons'

export function DiscordSettingsEntry(props: { player: Pick<PlayerModel, 'discordProfile'> }) {
  return (
    <div
      class="bg-abru-light-5 flex flex-row items-center gap-4 rounded-sm p-2"
      hx-target="this"
      hx-swap="outerHTML"
    >
      <IconBrandDiscord size={32} />
      <p class="font-bold">discord</p>
      {props.player.discordProfile ? (
        <>
          <p>
            Linked as <span safe>{props.player.discordProfile.displayName}</span>
          </p>
          <div class="flex-1"></div>
          <button
            class="button button--dense"
            hx-put="/discord/disconnect"
            data-umami-event="discord-disconnect"
          >
            Disconnect
          </button>
        </>
      ) : (
        <>
          <p>Connect your Discord account to get private team voice channels during games</p>
          <div class="flex-1"></div>
          <a
            class="button button--accent button--dense"
            href="/discord/auth"
            hx-boost="false"
            data-umami-event="discord-connect"
          >
            Connect
          </a>
        </>
      )}
    </div>
  )
}
