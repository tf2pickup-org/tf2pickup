import { PlayerRole } from '../../../../database/models/player.model'
import { z } from 'zod'
import { BannedGameServersList } from '../../../../admin/game-servers/views/html/serveme-tf-ban-gameservers'
import { RegionList } from '../../../../admin/game-servers/views/html/serveme-tf-preferred-region'
import { configuration } from '../../../../configuration'
import { routes } from '../../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.put(
    '/preferred-region',
    {
      config: {
        authorize: [PlayerRole.admin],
      },
      schema: {
        body: z.object({
          servemeTfPreferredRegion: z.string().transform(val => (val === 'none' ? null : val)),
        }),
      },
    },
    async (request, reply) => {
      await configuration.set('serveme_tf.preferred_region', request.body.servemeTfPreferredRegion)
      return reply.status(200).html(RegionList({ saveResult: { success: true } }))
    },
  )
    .post(
      '/ban-gameservers',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          body: z.object({
            pattern: z.string().min(1),
          }),
        },
      },
      async (request, reply) => {
        const { pattern } = request.body
        const config = await configuration.get('serveme_tf.ban_gameservers')

        if (config.some(c => c === pattern)) {
          return reply.status(200).html(BannedGameServersList())
        }

        await configuration.set('serveme_tf.ban_gameservers', [...config, pattern])
        return reply.status(200).html(BannedGameServersList())
      },
    )
    .delete(
      '/ban-gameservers/:pattern',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          params: z.object({
            pattern: z.string(),
          }),
        },
      },
      async (request, reply) => {
        const pattern = decodeURIComponent(request.params.pattern)
        const config = await configuration.get('serveme_tf.ban_gameservers')
        await configuration.set(
          'serveme_tf.ban_gameservers',
          config.filter(c => c !== pattern),
        )
        return reply.status(200).html(BannedGameServersList())
      },
    )
})
