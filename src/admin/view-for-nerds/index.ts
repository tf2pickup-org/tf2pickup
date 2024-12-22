import fp from 'fastify-plugin'
import { ConfigurationEntryEdit, ViewForNerdsPage } from './views/html/view-for-nerds.page'
import {
  type Configuration,
  configurationSchema,
} from '../../database/models/configuration-entry.model'
import { configuration } from '../../configuration'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { PlayerRole } from '../../database/models/player.model'
import { z } from 'zod'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app
      .withTypeProvider<ZodTypeProvider>()
      .get(
        '/admin/view-for-nerds',
        {
          config: {
            authorize: [PlayerRole.admin],
          },
        },
        async (request, reply) => {
          reply.html(await ViewForNerdsPage({ user: request.user! }))
        },
      )
      .post(
        '/admin/view-for-nerds',
        {
          config: { authorize: [PlayerRole.admin] },
          schema: {
            body: z
              .object({
                key: z.string(),
                value: z.string(),
              })
              .transform(({ key, value }) => {
                return { key, value: JSON.parse(value) as unknown }
              })
              .pipe(configurationSchema),
          },
        },
        async (request, reply) => {
          const { key, value } = request.body
          await configuration.set(key, value)
          const defaultValue = configuration.getDefault(key)
          reply.html(await ConfigurationEntryEdit({ _key: key, value, defaultValue }))
        },
      )
      .delete(
        '/admin/view-for-nerds',
        {
          config: {
            authorize: [PlayerRole.admin],
          },
          schema: {
            querystring: z.object({
              key: z.custom<keyof Configuration>(v =>
                configurationSchema.options.find(
                  option => option._def.shape().key._def.value === v,
                ),
              ),
            }),
          },
        },
        async (request, reply) => {
          const { key } = request.query
          const value = await configuration.reset(key)
          const defaultValue = configuration.getDefault(key)
          reply.html(await ConfigurationEntryEdit({ _key: key, value, defaultValue }))
        },
      )
  },
  {
    name: 'admin - /admin/view-for-nerds',
  },
)
