import { PlayerRole } from '../../../database/models/player.model'
import { ScrambleMaps } from '../../../admin/scramble-maps/views/html/scramble-maps.page'
import { queue } from '../../../queue'
import { MapVoteOptions } from '../../../admin/scramble-maps/views/html/map-vote-options'
import { routes } from '../../../utils/routes'
import { FlashMessage } from '../../../html/components/flash-message'
import { z } from 'zod'
import { secondsToMilliseconds } from 'date-fns'
import { configuration } from '../../../configuration'
import { requestContext } from '@fastify/request-context'
import { MapVoteTiming } from '../../../shared/types/map-vote-timing'

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
        await reply.html(ScrambleMaps())
      },
    )
    .put('/scramble', { config: { authorize: [PlayerRole.admin] } }, async (_request, reply) => {
      await queue.resetMapOptions()
      await reply.html(
        <>
          <MapVoteOptions />
          <FlashMessage type="success" message="Maps scrambled" />
        </>,
      )
    })
    .post(
      '/',
      {
        config: { authorize: [PlayerRole.admin] },
        schema: {
          body: z.object({
            mapVoteTiming: z.nativeEnum(MapVoteTiming),
            mapVoteTimeout: z.coerce.number().min(5).max(60),
          }),
        },
      },
      async (request, reply) => {
        const { mapVoteTiming, mapVoteTimeout } = request.body
        await configuration.set('queue.map_vote_timing', mapVoteTiming)
        await configuration.set('queue.map_vote_timeout', secondsToMilliseconds(mapVoteTimeout))
        requestContext.set('messages', { success: ['Configuration saved'] })
        await reply.html(await ScrambleMaps())
      },
    )
})
