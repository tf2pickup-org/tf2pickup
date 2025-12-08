import { players } from '../../players'
import { TwitchTvSettingsEntry } from '../../twitch-tv/views/html/twitch-tv-settings-entry'
import { twitchTv } from '../../twitch-tv'
import { routes } from '../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  if (!twitchTv.enabled) {
    return
  }

  app.put(
    '/disconnect',
    {
      config: {
        authenticate: true,
      },
    },
    async (request, reply) => {
      const player = await players.update(request.user!.player.steamId, {
        $unset: {
          twitchTvProfile: 1,
        },
      })
      reply.html(await TwitchTvSettingsEntry({ player }))
    },
  )
})
