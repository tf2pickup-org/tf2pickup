import { z } from 'zod'
import { PlayerRole } from '../../../database/models/player.model'
import { configuration } from '../../../configuration'
import { queues } from '../../../queues'
import { durationUnit } from '../../../admin/games/duration-unit'
import { routes } from '../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  const config = { authorize: [PlayerRole.admin] }

  app.post(
    '/',
    {
      config,
      schema: {
        body: z.object({
          preReadyUpTimeout: z.coerce.number().positive(),
          preReadyUpTimeoutUnit: z.enum(durationUnit.all),
        }),
      },
    },
    async (request, reply) => {
      const { preReadyUpTimeout, preReadyUpTimeoutUnit } = request.body
      await configuration.set(
        'queue.pre_ready_up_timeout',
        durationUnit.toMs(preReadyUpTimeout, preReadyUpTimeoutUnit),
        request.user!.player.steamId,
      )
      request.flash('success', 'Configuration saved')
      await reply.redirect('/admin/queues')
    },
  )
  // ponytail: a stale order (a queue added meanwhile) is a plain 400; the page reloads fine after
  app.post(
    '/order',
    { config, schema: { body: z.object({ 'order[]': z.array(z.string()).or(z.string()) }) } },
    async (request, reply) => {
      await queues.reorder([request.body['order[]']].flat())
      await reply.redirect('/admin/queues')
    },
  )
})
