import { errors } from '../../../errors'
import { queues } from '../../../queues'
import { queueSettingDefault } from '../../../queues/queue-setting-default'
import {
  queueConfigurationSchema,
  type QueueConfiguration,
} from '../../../database/models/queue.model'
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
                const result: unknown = { key, value: parsed }
                return result
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
        await configuration.set(key, value, request.user!.player.steamId)
        const defaultValue = configuration.getDefault(key)
        await reply.html(ConfigurationEntryEdit({ _key: key, value, defaultValue }))
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
        const value = await configuration.reset(key, request.user!.player.steamId)
        const defaultValue = configuration.getDefault(key)
        await reply.html(ConfigurationEntryEdit({ _key: key, value, defaultValue }))
      },
    )
    .post(
      '/queues',
      {
        config: { authorize: [PlayerRole.admin] },
        schema: { body: z.object({ key: z.string(), value: z.string() }) },
      },
      async (request, reply) => {
        const { queue, field } = await parseQueueKey(request.body.key)
        let value: unknown
        try {
          value = JSON.parse(request.body.value)
        } catch (e) {
          throw errors.badRequest(`Invalid JSON (${String(e)})`)
        }
        const updated = await queues.update(
          queue._id,
          { [field]: value },
          request.user!.player.steamId,
        )
        await reply.html(QueueEntryEdit(request.body.key, updated[field], field))
      },
    )
    .delete(
      '/queues',
      {
        config: { authorize: [PlayerRole.admin] },
        schema: { querystring: z.object({ key: z.string() }) },
      },
      async (request, reply) => {
        const { queue, field } = await parseQueueKey(request.query.key)
        const defaultValue = queueSettingDefault(field)
        if (defaultValue === undefined) {
          throw errors.badRequest(`${field} has no default`)
        }
        const updated = await queues.update(
          queue._id,
          { [field]: defaultValue },
          request.user!.player.steamId,
        )
        await reply.html(QueueEntryEdit(request.query.key, updated[field], field))
      },
    )
})

// queues.<slug>.<field>
async function parseQueueKey(key: string) {
  const [, slug, field] = /^queues\.([^.]+)\.([^.]+)$/.exec(key) ?? []
  if (!slug || !field || !(field in queueConfigurationSchema.shape)) {
    throw errors.badRequest(`not a queue setting: ${key}`)
  }
  return { queue: await queues.bySlug(slug), field: field as keyof QueueConfiguration }
}

function QueueEntryEdit(key: string, value: unknown, field: keyof QueueConfiguration) {
  const defaultValue = queueSettingDefault(field)
  return ConfigurationEntryEdit({
    _key: key,
    value,
    defaultValue: defaultValue === undefined ? value : defaultValue,
    url: '/admin/view-for-nerds/queues',
  })
}
