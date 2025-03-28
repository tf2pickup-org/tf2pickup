import type { User } from '../../../auth/types/user'
import { IconBrandTwitch } from '../../../html/components/icons'

export function TwitchTvSettingsEntry(props: { user: User }) {
  return (
    <div
      class="flex flex-row items-center gap-4 rounded bg-abru-light-5 p-2"
      hx-target="this"
      hx-swap="outerHTML"
    >
      <IconBrandTwitch size={32} />
      <p class="font-bold">twitch.tv</p>
      {props.user.player.twitchTvProfile ? (
        <>
          <p>
            Logged in as{' '}
            <a
              href={`https://www.twitch.tv/${props.user.player.twitchTvProfile.login}`}
              target="_blank"
              safe
            >
              {props.user.player.twitchTvProfile.login}
            </a>
          </p>
          <div class="flex-1"></div>
          <button
            class="button button--dense"
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
            class="button button--accent button--dense"
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
