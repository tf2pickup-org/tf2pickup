import { PlayerRole } from '../../../../database/models/player.model'
import { z } from 'zod'
import { players } from '../../../../players'
import { steamId64 } from '../../../../shared/schemas/steam-id-64'
import { routes } from '../../../../utils/routes'
import { AdminToolbox } from '../../../../players/views/html/admin-toolbox'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.put(
    '/',
    {
      config: {
        authorize: [PlayerRole.admin],
      },
      schema: {
        params: z.object({
          steamId: steamId64,
        }),
        body: z.object({
          verified: z.coerce.boolean().default(false),
        }),
      },
    },
    async (request, reply) => {
      const { steamId } = request.params
      const { verified } = request.body
      await players.setVerified(steamId, verified, request.user!.player.steamId)
      const player = await players.bySteamId(steamId, [
        'steamId',
        'skill',
        'skillHistory',
        'verified',
      ])
      reply.html(await AdminToolbox({ player }))
    },
  )
})
