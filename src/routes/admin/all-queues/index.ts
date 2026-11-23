import { z } from 'zod'
import { PlayerRole } from '../../../database/models/player.model'
import { configuration } from '../../../configuration'
import { durationUnit } from '../../../admin/games/duration-unit'
import { routes } from '../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.post(
    '/',
    {
      config: { authorize: [PlayerRole.admin] },
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
})
