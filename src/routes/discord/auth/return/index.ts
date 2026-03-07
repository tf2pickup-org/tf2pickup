import { z } from 'zod'
import { logger } from '../../../../logger'
import { errors } from '../../../../errors'
import { discord } from '../../../../discord'
import { routes } from '../../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  if (!discord.oauthEnabled) {
    return
  }

  app.get(
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
        logger.error({ query: request.query }, `discord auth error`)
        throw errors.internalServerError(`discord auth error`)
      }

      const { steamId } = await discord.state.verify(request.query.state)
      await discord.saveUserProfile({ steamId, code: request.query.code })
      reply.redirect('/settings', 302)
    },
  )
})
