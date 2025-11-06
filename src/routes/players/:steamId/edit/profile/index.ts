import z from 'zod'
import { PlayerRole } from '../../../../../database/models/player.model'
import { steamId64 } from '../../../../../shared/schemas/steam-id-64'
import { players } from '../../../../../players'
import { EditPlayerProfilePage } from '../../../../../players/views/html/edit-player.page'
import { routes } from '../../../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get(
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
      async (req, reply) => {
        const { steamId } = req.params
        const player = await players.bySteamId(steamId)
        reply.status(200).html(await EditPlayerProfilePage({ player, user: req.user! }))
      },
    )
    .post(
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
            name: z.string(),
            cooldownLevel: z.coerce.number().min(0),
          }),
        },
      },
      async (req, reply) => {
        const { steamId } = req.params
        const { name, cooldownLevel } = req.body

        await players.update(
          steamId,
          { $set: { name, cooldownLevel } },
          {},
          req.user!.player.steamId,
        )
        req.flash('success', `Player updated`)
        await reply.redirect(`/players/${steamId}`)
      },
    )
})
