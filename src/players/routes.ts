import fp from 'fastify-plugin'
import { PlayerListPage } from './views/html/player-list.page'
import { PlayerPage } from './views/html/player.page'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { steamId64 } from '../shared/schemas/steam-id-64'
import { collections } from '../database/collections'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.get('/players', async (req, reply) => {
      reply.status(200).html(await PlayerListPage(req.user))
    })

    app.withTypeProvider<ZodTypeProvider>().get(
      '/players/:steamId',
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
        const player = await collections.players.findOne({ steamId })
        if (!player) {
          return reply.notFound(`player not found: ${steamId}`)
        }
        reply
          .status(200)
          .html(
            await PlayerPage({ player, user: req.user, page: Number(req.query.gamespage) || 1 }),
          )
      },
    )
  },
  { name: 'players routes' },
)
