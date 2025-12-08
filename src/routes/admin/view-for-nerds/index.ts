import { PlayerRole } from '../../../database/models/player.model'
import {
  ConfigurationEntryEdit,
  ViewForNerdsPage,
} from '../../../admin/view-for-nerds/views/html/view-for-nerds.page'
import { z } from 'zod'
import {
  configurationSchema,
  type Configuration,
} from '../../../database/models/configuration-entry.model'
import { configuration } from '../../../configuration'
import { routes } from '../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
      },
      async (_request, reply) => {
        await reply.html(ViewForNerdsPage())
      },
    )
    .post(
      '/',
      {
        config: { authorize: [PlayerRole.admin] },
        schema: {
          body: z
            .object({
              key: z.string(),
              value: z.string(),
            })
            .transform(({ key, value }, ctx) => {
              try {
                const parsed = JSON.parse(value) as unknown
                return { key, value: parsed } as unknown
              } catch (e) {
                ctx.issues.push({
                  code: 'custom',
                  message: `Invalid JSON (${String(e)})`,
                  input: value,
                })
                return z.NEVER
              }
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
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          querystring: z.object({
            key: z.custom<keyof Configuration>(v =>
              configurationSchema.options.find(
                option => option._zod.def.shape.key._zod.def.values[0] === v,
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
})
