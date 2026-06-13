import { PlayerRole } from '../../../../../../database/models/player.model'
import { z } from 'zod'
import { players } from '../../../../../../players'
import { AddBanPage } from '../../../../../../players/views/html/add-ban.page'
import { steamId64 } from '../../../../../../shared/schemas/steam-id-64'
import { banExpiryFormSchema } from '../../../../../../players/schemas/ban-expiry-form.schema'
import { routes } from '../../../../../../utils/routes'

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
      async (request, reply) => {
        const { steamId } = request.params
        reply.status(200).html(await AddBanPage({ steamId }))
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
          body: z.intersection(
            banExpiryFormSchema,
            z.object({
              reason: z.string(),
              // When the checkbox is unchecked, browsers omit it from the request body entirely.
              // The default(false) here handles that case.
              anonymous: z.coerce.boolean().default(false),
            }),
          ),
        },
      },
      async (request, reply) => {
        await players.addBan({
          player: request.params.steamId,
          admin: request.user!.player.steamId,
          end: players.getBanExpiryDate(request.body),
          reason: request.body.reason,
          anonymous: request.body.anonymous,
        })
        request.flash('success', `Player ban added`)
        reply.redirect(`/players/${request.params.steamId}/edit/bans`)
      },
    )
})
