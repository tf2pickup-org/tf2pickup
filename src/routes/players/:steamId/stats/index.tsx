import z from 'zod'
import { players } from '../../../../players'
import { PlayerStatsPage } from '../../../../players/views/html/player-stats.page'
import { steamId64 } from '../../../../shared/schemas/steam-id-64'
import { Gamemode } from '../../../../shared/types/gamemode'
import { routes } from '../../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        params: z.object({ steamId: steamId64 }),
        querystring: z.object({ gamemode: z.enum(Gamemode).optional() }),
      },
    },
    async (req, reply) => {
      const player = await players.bySteamId(req.params.steamId, [
        'steamId',
        'name',
        'joinedAt',
        'roles',
        'etf2lProfile',
        'twitchTvProfile',
        'avatar.large',
        'stats',
        'skill',
        'skillHistory',
        'verified',
        'bans',
        'chatMutes',
        'elo',
      ])
      await reply.html(<PlayerStatsPage player={player} gamemode={req.query.gamemode} />)
    },
  )
})
