import { PlayerRole } from '../../../database/models/player.model'
import { ScrambleMaps } from '../../../admin/scramble-maps/views/html/scramble-maps.page'
import { queue } from '../../../queue-auto'
import { MapVoteOptions } from '../../../admin/scramble-maps/views/html/map-vote-options'
import { routes } from '../../../utils/routes'
import { FlashMessage } from '../../../html/components/flash-message'
import { collections } from '../../../database/collections'
import { recordMapScramble } from '../../../activity-log/record-map-scramble'

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
    .put('/scramble', { config: { authorize: [PlayerRole.admin] } }, async (request, reply) => {
      await queue.resetMapOptions()
      const newMaps = await collections.queueMapOptions
        .find({}, { projection: { name: 1 } })
        .toArray()
      await recordMapScramble(
        request.user!.player.steamId,
        newMaps.map(m => m.name),
      )
      await reply.html(
        <>
          <MapVoteOptions />
          <FlashMessage type="success" message="Maps scrambled" />
        </>,
      )
    })
})
