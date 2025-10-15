import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { PlayerRole } from '../../../../../database/models/player.model'
import { z } from 'zod'
import { players } from '../../../../../players'
import { steamId64 } from '../../../../../shared/schemas/steam-id-64'
import { BanDetails, EditPlayerBansPage } from '../../../../../players/views/html/edit-player.page'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
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
        reply.status(200).html(await EditPlayerBansPage({ player, user: req.user! }))
      },
    )
    .put(
      '/:banStart/revoke',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          params: z.object({
            steamId: steamId64,
            banStart: z.coerce.number().transform(value => new Date(value)),
          }),
        },
      },
      async (request, reply) => {
        const { steamId, banStart } = request.params
        const player = await players.bySteamId(steamId)
        const ban = await players.revokeBan({
          player: steamId,
          banStart,
          admin: request.user!.player.steamId,
        })
        reply.status(200).html(await BanDetails({ player, ban }))
      },
    )
}
