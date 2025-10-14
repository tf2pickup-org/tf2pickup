import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { players } from '../../players'
import { TwitchTvSettingsEntry } from '../../twitch-tv/views/html/twitch-tv-settings-entry'
import { twitchTv } from '../../twitch-tv'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  if (!twitchTv.enabled) {
    return
  }

  app.withTypeProvider<ZodTypeProvider>().put(
    '/disconnect',
    {
      config: {
        authenticate: true,
      },
    },
    async (request, reply) => {
      const player = await players.update(
        request.user!.player.steamId,

        {
          $unset: {
            twitchTvProfile: 1,
          },
        },
      )
      reply.html(await TwitchTvSettingsEntry({ user: { player } }))
    },
  )
}
