import type { PlayerModel } from '../../../database/models/player.model'
import { IconBrandTwitch } from '../../../html/components/icons'

export function TwitchTvSettingsEntry(props: { player: Pick<PlayerModel, 'twitchTvProfile'> }) {
  return (
    <div
      class="flex flex-row items-center gap-4 rounded bg-abru-light-5 p-2"
      hx-target="this"
      hx-swap="outerHTML"
    >
      <IconBrandTwitch size={32} />
      <p class="font-bold">twitch.tv</p>
      {props.player.twitchTvProfile ? (
        <>
          <p>
            Logged in as{' '}
            <a
              href={`https://www.twitch.tv/${props.player.twitchTvProfile.login}`}
              target="_blank"
              safe
            >
              {props.player.twitchTvProfile.login}
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
