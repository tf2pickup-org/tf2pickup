import { z } from 'zod'
import { PlayerRole } from '../../../database/models/player.model'
import { ScrambleMaps } from '../../../admin/scramble-maps/views/html/scramble-maps.page'
import { queues } from '../../../queues'
import { resetMapOptions } from '../../../maps/reset-options'
import { MapVoteOptions } from '../../../admin/scramble-maps/views/html/map-vote-options'
import { routes } from '../../../utils/routes'
import { FlashMessage } from '../../../html/components/flash-message'
import { collections } from '../../../database/collections'
import { activityLog } from '../../../activity-log'

const queueQuery = z.object({ queue: z.string().optional() })

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: { querystring: queueQuery },
      },
      async (request, reply) => {
        await reply.html(ScrambleMaps({ queue: await queues.bySlugOrDefault(request.query.queue) }))
      },
    )
    .put(
      '/scramble',
      { config: { authorize: [PlayerRole.admin] }, schema: { querystring: queueQuery } },
      async (request, reply) => {
        const queue = (await queues.bySlugOrDefault(request.query.queue))._id
        await resetMapOptions(queue)
        const newMaps = await collections.queueMapOptions
          .find({ queue }, { projection: { name: 1 } })
          .toArray()
        await activityLog.recordMapScramble(
          request.user!.player.steamId,
          newMaps.map(m => m.name),
        )
        await reply.html(
          <>
            <MapVoteOptions queue={queue} />
            <FlashMessage type="success" message="Maps scrambled" />
          </>,
        )
      },
    )
})
