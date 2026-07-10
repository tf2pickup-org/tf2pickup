import z from 'zod'
import { PlayerRole } from '../../../../../database/models/player.model'
import { steamId64 } from '../../../../../shared/schemas/steam-id-64'
import { Gamemode } from '../../../../../shared/types/gamemode'
import { defaultGamemode } from '../../../../../shared/enabled-gamemodes'
import {
  EditPlayerElo,
  EditPlayerEloPage,
} from '../../../../../players/views/html/edit-player.page'
import { routes } from '../../../../../utils/routes'

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
        querystring: z.object({
          gamemode: z.enum(Gamemode).optional(),
        }),
      },
    },
    async (req, reply) => {
      const { steamId } = req.params
      const gamemode = req.query.gamemode ?? defaultGamemode
      await reply
        .status(200)
        .html(
          req.isPartialFor('edit-player-elo')
            ? EditPlayerElo({ steamId, gamemode })
            : EditPlayerEloPage({ steamId, gamemode }),
        )
    },
  )
})
