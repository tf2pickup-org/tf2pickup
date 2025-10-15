import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { PlayerRole } from '../../../../../../database/models/player.model'
import { z } from 'zod'
import { players } from '../../../../../../players'
import { AddBanPage } from '../../../../../../players/views/html/add-ban.page'
import { steamId64 } from '../../../../../../shared/schemas/steam-id-64'
import { banExpiryFormSchema } from '../../../../../../players/schemas/ban-expiry-form.schema'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .get(
      '/players/:steamId/edit/bans/add',
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
        const player = await players.bySteamId(steamId)
        reply.status(200).html(await AddBanPage({ player, user: request.user! }))
      },
    )
    .post(
      '/players/:steamId/edit/bans/add',
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
        })
        request.flash('success', `Player ban added`)
        reply.redirect(`/players/${request.params.steamId}/edit/bans`)
      },
    )
}
