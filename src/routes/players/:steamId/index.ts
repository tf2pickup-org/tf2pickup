import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { bySteamId } from '../../../players/by-steam-id'
import { PlayerPage } from '../../../players/views/html/player.page'
import { steamId64 } from '../../../shared/schemas/steam-id-64'
import { collections } from '../../../database/collections'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
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
        const player = await bySteamId(steamId)
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
}
