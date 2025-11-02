import z from 'zod'
import { PlayerRole } from '../../../../../database/models/player.model'
import { steamId64 } from '../../../../../shared/schemas/steam-id-64'
import { players } from '../../../../../players'
import { EditPlayerRolesPage } from '../../../../../players/views/html/edit-player.page'
import { routes } from '../../../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get(
      '/',
      {
        config: {
          authorize: [PlayerRole.superUser],
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
        reply.status(200).html(await EditPlayerRolesPage({ player, user: req.user! }))
      },
    )
    .post(
      '/',
      {
        config: {
          authorize: [PlayerRole.superUser],
        },
        schema: {
          params: z.object({
            steamId: steamId64,
          }),
          body: z.object({
            roles: z
              .union([z.array(z.enum(PlayerRole)), z.enum(PlayerRole).transform(role => [role])])
              .default([]),
          }),
        },
      },
      async (req, reply) => {
        const { steamId } = req.params
        const { roles } = req.body

        await players.update(steamId, { $set: { roles } }, {}, req.user!.player.steamId)
        req.flash('success', `Player roles updated`)
        await reply.redirect(`/players/${steamId}`)
      },
    )
})
