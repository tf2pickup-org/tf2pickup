import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { twitchTv } from '../../../twitch-tv'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  if (!twitchTv.enabled) {
    return
  }

  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      config: {
        authenticate: true,
      },
    },
    async (request, reply) => {
      const url = twitchTv.makeOauthRedirectUrl(
        await twitchTv.state.make({ steamId: request.user!.player.steamId }),
      )
      reply.redirect(url, 302)
    },
  )
}
