import { PlayerRole } from '../../../../../../database/models/player.model'
import { z } from 'zod'
import { steamId64 } from '../../../../../../shared/schemas/steam-id-64'
import { AdminToolbox } from '../../../../../../players/views/html/admin-toolbox'
import { routes } from '../../../../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      config: {
        authorize: [PlayerRole.admin],
      },
      schema: {
        params: z.object({
          steamId: steamId64,
        }),
      },
    },
    async (_, reply) => {
      return reply.html(AdminToolbox.replaceSkillValues({ skill: {} }))
    },
  )
})
