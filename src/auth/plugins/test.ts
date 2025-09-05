import fp from 'fastify-plugin'
import { z } from 'zod'
import { steamId64 } from '../../shared/schemas/steam-id-64'
import { environment } from '../../environment'
import { logger } from '../../logger'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    if (environment.ENABLE_TEST_AUTH !== 'true') {
      return
    }

    logger.warn('Test auth is enabled. This should only be used in development.')

    // This endpoint is used by playwright tests, is insecure and mustn't be used in production.
    app.withTypeProvider<ZodTypeProvider>().get(
      '/auth/test',
      {
        schema: {
          querystring: z.object({
            steamId: steamId64,
          }),
        },
      },
      async (request, reply) => {
        request.session.set('steamId', request.query.steamId)
        return await reply.redirect(environment.WEBSITE_URL, 302)
      },
    )
  },
  {
    name: 'auth for tests',
  },
)
