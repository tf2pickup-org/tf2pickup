import { PlayerRole } from '../../../database/models/player.model'
import { ScrambleMaps } from '../../../admin/scramble-maps/views/html/scramble-maps.page'
import { queue } from '../../../queue'
import { MapVoteOptions } from '../../../admin/scramble-maps/views/html/map-vote-options'
import { routes } from '../../../utils/routes'
import { FlashMessages } from '../../../html/components/flash-messages'

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
      // await reply.trigger({ message: 'Maps scrambled' }).html(MapVoteOptions())
      reply.html(
        (await MapVoteOptions()) +
          (await FlashMessages.append({ message: 'Maps scrambled', type: 'success' })),
      )
    })
})
