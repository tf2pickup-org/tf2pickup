import fp from 'fastify-plugin'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { GameListPage } from './views/html/game-list.page'
import { GamePage } from './views/html/game.page'
import type { GameNumber } from '../database/models/game.model'
import { steamId64 } from '../shared/schemas/steam-id-64'
import { gameNumber } from './schemas/game-number'
import { substitutePlayer } from './substitute-player'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app
      .withTypeProvider<ZodTypeProvider>()
      .get(
        '/games',
        {
          schema: {
            querystring: z.object({
              page: z.coerce.number().optional(),
            }),
          },
        },
        async (request, reply) => {
          reply.status(200).html(await GameListPage(request.user, Number(request.query.page) || 1))
        },
      )
      .get(
        '/games/:number',
        {
          schema: {
            params: z.object({
              number: gameNumber,
            }),
          },
        },
        async (request, reply) => {
          reply.status(200).html(await GamePage(request.params.number, request.user))
        },
      )
      .put(
        '/games/:number/substitute-player',
        {
          schema: {
            params: z.object({
              number: z.coerce
                .number()
                .positive()
                .transform(number => number as GameNumber),
            }),
            body: z.object({
              player: steamId64,
            }),
          },
        },
        async (request, reply) => {
          if (!request.isAdmin) {
            await reply.status(403).send()
            return
          }

          const number = request.params.number
          const replacee = request.body.player

          await substitutePlayer({ number, replacee, actor: request.user!.player.steamId })
          await reply.status(204).send()
        },
      )
  },
  {
    name: 'games routes',
  },
)
