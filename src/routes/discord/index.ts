import { players } from '../../players'
import { discord } from '../../discord'
import { DiscordSettingsEntry } from '../../discord/views/html/discord-settings-entry'
import { routes } from '../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  if (!discord.oauthEnabled) {
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
          discordProfile: 1,
        },
      })
      reply.html(await DiscordSettingsEntry({ player }))
    },
  )
})
