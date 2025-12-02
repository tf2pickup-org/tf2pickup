import z from 'zod'
import { PlayerPage } from '../../../players/views/html/player.page'
import { steamId64 } from '../../../shared/schemas/steam-id-64'
import { players } from '../../../players'
import { routes } from '../../../utils/routes'
import { tasks } from '../../../tasks'
import { shouldSyncEtf2lProfile } from '../../../etf2l/should-sync-etf2l-profile'
import { collections } from '../../../database/collections'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get(
      '/',
      {
        schema: {
          params: z.object({
            steamId: steamId64,
          }),
          querystring: z.object({
            gamespage: z.coerce.number().optional(),
          }),
        },
      },
      async (req, reply) => {
        const { steamId } = req.params
        const player = await players.bySteamId(steamId)

        if (shouldSyncEtf2lProfile(player)) {
          await tasks.schedule('etf2l:syncPlayerProfile', 0, { player: steamId })
        }

        reply.status(200).html(
          await PlayerPage({
            player,
            user: req.user,
            page: Number(req.query.gamespage) || 1,
          }),
        )
      },
    )
    .post(
      '/accept-rules',
      {
        schema: {
          params: z.object({
            steamId: steamId64,
          }),
        },
      },
      async (request, reply) => {
        await collections.players.updateOne(
          { steamId: request.params.steamId },
          { $set: { hasAcceptedRules: true } },
        )
        await reply.redirect('/')
      },
    )
})
