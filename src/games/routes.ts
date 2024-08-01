import fp from 'fastify-plugin'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { GameListPage } from './views/html/game-list.page'
import { GamePage } from './views/html/game.page'
import { steamId64 } from '../shared/schemas/steam-id-64'
import { gameNumber } from './schemas/game-number'
import { requestSubstitute } from './request-substitute'
import { replacePlayer } from './replace-player'
import { forceEnd } from './force-end'
import { collections } from '../database/collections'
import { PlayerRole } from '../database/models/player.model'

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
          const { number } = request.params
          const game = await collections.games.findOne({ number })
          if (!game) {
            return reply.notFound()
          }

          reply.status(200).html(await GamePage({ game, user: request.user }))
        },
      )
      .put(
        '/games/:number/request-substitute',
        {
          config: {
            authorize: [PlayerRole.admin],
          },
          schema: {
            params: z.object({
              number: gameNumber,
            }),
            body: z.object({
              player: steamId64,
            }),
          },
        },
        async (request, reply) => {
          const number = request.params.number
          const replacee = request.body.player

          await requestSubstitute({ number, replacee, actor: request.user!.player.steamId })
          await reply.status(204).send()
        },
      )
      .put(
        '/games/:number/replace-player',
        {
          config: {
            authenticate: true,
          },
          schema: {
            params: z.object({
              number: gameNumber,
            }),
            body: z.object({
              player: steamId64,
            }),
          },
        },
        async (request, reply) => {
          const number = request.params.number
          const replacee = request.body.player
          const replacement = request.user!.player.steamId

          await replacePlayer({ number, replacee, replacement })
          await reply.status(204).send()
        },
      )
      .put(
        '/games/:number/force-end',
        {
          config: {
            authorize: [PlayerRole.admin],
          },
          schema: {
            params: z.object({
              number: gameNumber,
            }),
          },
        },
        async (request, reply) => {
          await forceEnd(request.params.number, request.user!.player.steamId)
          await reply.status(204).send()
        },
      )
  },
  {
    name: 'games routes',
  },
)
