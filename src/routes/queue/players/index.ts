import { PlayerRole } from '../../../database/models/player.model'
import { routes } from '../../../utils/routes'
import { getSlots } from '../../../queue/get-slots'
import { kick } from '../../../queue/kick'
import { events } from '../../../events'

export default routes(async app => {
  app.delete(
    '/',
    {
      config: {
        authorize: [PlayerRole.admin],
      },
    },
    async (request, reply) => {
      const slots = await getSlots()
      const steamIds = slots.flatMap(slot => (slot.player ? [slot.player.steamId] : []))

      if (steamIds.length > 0) {
        await kick(...steamIds)
        events.emit('queue:cleared', {
          admin: request.user!.player.steamId,
          playerCount: steamIds.length,
        })
      }

      reply.status(204).send()
    },
  )
})
