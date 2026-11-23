import { z } from 'zod'
import { PlayerRole } from '../../../database/models/player.model'
import {
  configurationSchema,
  type Configuration,
} from '../../../database/models/configuration-entry.model'
import { configuration } from '../../../configuration'
import { routes } from '../../../utils/routes'
import { errors } from '../../../errors'
import { queues } from '../../../queues'
import { queueSettingDefault } from '../../../queues/queue-setting-default'
import { parseQueueSettingKey } from '../../../admin/parse-queue-setting-key'

const isConfigurationKey = (key: string): key is keyof Configuration =>
  configurationSchema.options.some(option => option._zod.def.shape.key._zod.def.values[0] === key)

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.post(
    '/',
    {
      config: { authorize: [PlayerRole.admin] },
      schema: { body: z.object({ key: z.string() }) },
    },
    async (request, reply) => {
      const { key } = request.body
      const actor = request.user!.player.steamId
      if (isConfigurationKey(key)) {
        await configuration.reset(key, actor)
      } else {
        const { queue, field } = await parseQueueSettingKey(key)
        const defaultValue = queueSettingDefault(field)
        if (defaultValue === undefined) {
          throw errors.badRequest(`${field} has no default`)
        }
        await queues.update(queue._id, { [field]: defaultValue }, actor)
      }
      await reply.header('HX-Refresh', 'true').send()
    },
  )
})
