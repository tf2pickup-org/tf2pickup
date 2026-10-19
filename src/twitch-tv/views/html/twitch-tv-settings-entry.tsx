import type { PlayerModel } from '../../../database/models/player.model'
import { IconBrandTwitch } from '../../../html/components/icons'

export function TwitchTvSettingsEntry(props: { player: Pick<PlayerModel, 'twitchTvProfile'> }) {
  return (
    <div
      class="page-actions flex-row items-center gap-x-8! px-5"
      hx-target="this"
      hx-swap="outerHTML"
    >
      <p class="flex items-center gap-1 text-2xl font-bold">
        <IconBrandTwitch size={24} />
        Twitch.tv
      </p>
      {props.player.twitchTvProfile ? (
        <>
          <p>
            Logged in as:{' '}
            <a
              href={`https://www.twitch.tv/${props.player.twitchTvProfile.login}`}
              target="_blank"
              class="hover:underline"
              safe
            >
              {props.player.twitchTvProfile.login}
            </a>
          </p>
          <div class="flex-1"></div>
          <button
            class="button"

            hx-put="/twitch/disconnect"
            data-umami-event="twitch-disconnect"
          >
            Disconnect
          </button>
        </>
      ) : (
        <>
          <p>Connect your twitch.tv profile to advertise your streams on the main page</p>
          <div class="flex-1"></div>
          <a
            class="button"
            data-variant="accent"

            href="/twitch/auth"
            hx-boost="false"
            data-umami-event="twitch-connect"
          >
            Connect
          </a>
        </>
      )}
    </div>
  )
}
