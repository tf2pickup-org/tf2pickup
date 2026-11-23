import { z } from 'zod'
import { PlayerRole } from '../../../database/models/player.model'
import { queues } from '../../../queues'
import { routes } from '../../../utils/routes'

// ponytail: kept for old bookmarks; the map pool lives on the queue page now
// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      config: { authorize: [PlayerRole.admin] },
      schema: { querystring: z.object({ queue: z.string().optional() }) },
    },
    async (request, reply) => {
      const queue = await queues.bySlugOrDefault(request.query.queue)
      await reply.redirect(`/admin/queues/${queue.slug}/maps`, 301)
    },
  )
})
