import fp from 'fastify-plugin'
import { z } from 'zod'
import { createHash, timingSafeEqual } from 'node:crypto'
import { steamId64 } from '../../shared/schemas/steam-id-64'
import { environment } from '../../environment'
import { logger } from '../../logger'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

function sha256(value: string) {
  return createHash('sha256').update(value).digest()
}

function isSecretValid(given: string | undefined) {
  const expected = environment.TEST_AUTH_SECRET
  if (expected === undefined) {
    return true
  }

  // hashing first gives timingSafeEqual equal-length inputs without leaking the secret's length
  return given !== undefined && timingSafeEqual(sha256(given), sha256(expected))
}

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    if (environment.ENABLE_TEST_AUTH !== 'true') {
      return
    }

    logger.warn('Test auth is enabled. This should only be used in development.')

    // This endpoint is used by playwright tests and AI agents. Without TEST_AUTH_SECRET it is
    // insecure and mustn't be used in production.
    app.withTypeProvider<ZodTypeProvider>().get(
      '/auth/test',
      {
        schema: {
          querystring: z.object({
            steamId: steamId64,
            secret: z.string().optional(),
          }),
        },
      },
      async (request, reply) => {
        if (!isSecretValid(request.query.secret)) {
          return await reply.code(403).send()
        }

        request.session.set('steamId', request.query.steamId)
        return await reply.redirect(environment.WEBSITE_URL, 302)
      },
    )
  },
  {
    name: 'auth for tests',
  },
)
