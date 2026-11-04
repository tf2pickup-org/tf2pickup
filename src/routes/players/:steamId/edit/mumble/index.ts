import z from 'zod'
import { PlayerRole } from '../../../../../database/models/player.model'
import { steamId64 } from '../../../../../shared/schemas/steam-id-64'
import { players } from '../../../../../players'
import { EditPlayerMumblePage } from '../../../../../players/views/html/edit-player.page'
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
        await reply.status(200).html(EditPlayerMumblePage({ steamId }))
      },
    )
    .post(
      '/unlink',
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
        await players.update(
          steamId,
          { $unset: { mumbleCertificate: 1 } },
          {},
          req.user!.player.steamId,
        )
        req.flash('success', `Mumble certificate unlinked`)
        await reply.redirect(`/players/${steamId}/edit/mumble`)
      },
    )
})
