import { PlayerRole } from '../../../database/models/player.model'
import { routes } from '../../../utils/routes'
import { getSlots } from '../../../queue-auto/get-slots'
import { currentGamemode } from '../../../shared/current-gamemode'
import { kick } from '../../../queue-auto/kick'
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
      const slots = await getSlots(currentGamemode)
      const steamIds = slots.flatMap(slot => (slot.player ? [slot.player.steamId] : []))

      if (steamIds.length > 0) {
        await kick(...steamIds)
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
