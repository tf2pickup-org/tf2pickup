import { PlayerRole } from '../../../database/models/player.model'
import { routes } from '../../../utils/routes'
import { configuration } from '../../../configuration'
import { collections } from '../../../database/collections'
import { getSlots } from '../../../queue-auto/get-slots'
import { kick } from '../../../queue-auto/kick'
import { kick as kickFromCaptainQueue } from '../../../queue-captain/kick'
import { events } from '../../../events'
import { activityLog } from '../../../activity-log'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.delete(
    '/',
    {
      config: {
        authorize: [PlayerRole.admin],
      },
    },
    async (request, reply) => {
      const mode = await configuration.get('queue.mode')
      const steamIds =
        mode === 'captain'
          ? (await collections.queuePlayers.find({}).toArray()).map(player => player.steamId)
          : (await getSlots()).flatMap(slot => (slot.player ? [slot.player.steamId] : []))

      if (steamIds.length > 0) {
        await (mode === 'captain' ? kickFromCaptainQueue(...steamIds) : kick(...steamIds))
        events.emit('queue:cleared', {
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
