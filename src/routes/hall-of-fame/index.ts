import { z } from 'zod'
import { HallOfFamePage } from '../../hall-of-game/views/html/hall-of-fame.page'
import { routes } from '../../utils/routes'
import { Gamemode } from '../../shared/types/gamemode'
import { defaultGamemode } from '../../shared/enabled-gamemodes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        querystring: z.object({
          gamemode: z.enum(Gamemode).optional(),
        }),
      },
    },
    async (request, reply) => {
      const gamemode = request.query.gamemode ?? defaultGamemode
      await reply.status(200).html(HallOfFamePage({ gamemode }))
    },
  )
})
