import fp from 'fastify-plugin'
import { makeOauthRedirectUrl } from './make-oauth-redirect-url'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { saveUserProfile } from './save-user-profile'
import { logger } from '../logger'
import { errors } from '../errors'
import { state } from './state'
import { TwitchTvSettingsEntry } from './views/html/twitch-tv-settings-entry'
import { players } from '../players'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  app
    .withTypeProvider<ZodTypeProvider>()
    .get(
      '/twitch/auth',
      {
        config: {
          authenticate: true,
        },
      },
      async (request, reply) => {
        const url = makeOauthRedirectUrl(
          await state.make({ steamId: request.user!.player.steamId }),
        )
        reply.redirect(url, 302)
      },
    )
    .get(
      '/twitch/auth/return',
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

        const { steamId } = await state.verify(request.query.state)
        await saveUserProfile({ steamId, code: request.query.code })
        reply.redirect('/settings', 302)
      },
    )
    .put(
      '/twitch/disconnect',
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
})
