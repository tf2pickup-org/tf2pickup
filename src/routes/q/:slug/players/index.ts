import { z } from 'zod'
import { PlayerRole } from '../../../../database/models/player.model'
import { routes } from '../../../../utils/routes'
import { getSlots } from '../../../../queues/auto/get-slots'
import { kick } from '../../../../queues/auto/kick'
import { events } from '../../../../events'
import { activityLog } from '../../../../activity-log'
import { queues } from '../../../../queues'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.delete(
    '/',
    {
      config: {
        authorize: [PlayerRole.admin],
      },
      schema: { params: z.object({ slug: z.string() }) },
    },
    async (request, reply) => {
      const queue = (await queues.bySlug(request.params.slug))._id
      const slots = await getSlots(queue)
      const steamIds = slots.flatMap(slot => (slot.player ? [slot.player.steamId] : []))

      if (steamIds.length > 0) {
        await kick(...steamIds)
        events.emit('queue:cleared', {
          queue,
          admin: request.user!.player.steamId,
          playerCount: steamIds.length,
        })
        await activityLog.record({
          type: 'queue cleared',
          actor: request.user!.player.steamId,
          playerCount: steamIds.length,
        })
      }

      await reply.status(204).send()
    },
  )
})
