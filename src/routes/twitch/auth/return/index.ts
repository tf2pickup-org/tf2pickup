import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { logger } from '../../../../logger'
import { errors } from '../../../../errors'
import { twitchTv } from '../../../../twitch-tv'

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
      schema: {
        querystring: z.intersection(
          z.union([
            z.object({
              code: z.string(),
            }),
            z.object({
              error: z.string(),
              error_description: z.string().optional(),
            }),
          ]),
          z.object({
            state: z.string(),
          }),
        ),
      },
    },
    async (request, reply) => {
      if ('error' in request.query) {
        logger.error({ query: request.query }, `twitch.tv auth error`)
        throw errors.internalServerError(`twitch.tv auth error`)
      }

      const { steamId } = await twitchTv.state.verify(request.query.state)
      await twitchTv.saveUserProfile({ steamId, code: request.query.code })
      reply.redirect('/settings', 302)
    },
  )
}
