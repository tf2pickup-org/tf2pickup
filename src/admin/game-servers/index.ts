import fp from 'fastify-plugin'
import { GameServersPage } from './views/html/game-servers.page'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { PlayerRole } from '../../database/models/player.model'
import { z } from 'zod'
import { configuration } from '../../configuration'
import { RegionList } from './views/html/serveme-tf-preferred-region'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app
      .withTypeProvider<ZodTypeProvider>()
      .get(
        '/admin/game-servers',
        {
          config: {
            authorize: [PlayerRole.admin],
          },
        },
        async (request, reply) => {
          return reply.status(200).html(GameServersPage({ user: request.user! }))
        },
      )
      .put(
        '/admin/game-servers/serveme-tf/preferred-region',
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
          await configuration.set(
            'serveme_tf.preferred_region',
            request.body.servemeTfPreferredRegion,
          )
          return reply.status(200).html(RegionList({ saveResult: { success: true } }))
        },
      )
  },
  {
    name: `admin - game servers`,
  },
)
