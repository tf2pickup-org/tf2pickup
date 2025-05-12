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
import { PlayerRole } from '../database/models/player.model'
import { findOne } from './find-one'
import { requestGameServerReinitialization } from './request-game-server-reinitialization'
import { gameServers } from '../game-servers'
import { games } from '.'
import { collections } from '../database/collections'
import { environment } from '../environment'
import { Readable } from 'stream'

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
          reply.status(200).html(
            await GameListPage({
              user: request.user,
              page: Number(request.query.page) || 1,
            }),
          )
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
          const game = await findOne({ number })
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
      .put(
        '/games/:number/reinitialize-gameserver',
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
          await requestGameServerReinitialization(
            request.params.number,
            request.user!.player.steamId,
          )
          await reply.status(204).send()
        },
      )
      .put(
        '/games/:number/reassign-gameserver',
        {
          config: {
            authorize: [PlayerRole.admin],
          },
          schema: {
            params: z.object({ number: gameNumber }),
            body: z.object({
              gameServer: z.string(),
            }),
          },
        },
        async (request, reply) => {
          const { number } = request.params
          const { gameServer } = request.body
          const game = await games.findOne({ number })
          await gameServers.assign(game, gameServer)
          await reply
            .status(204)
            .header(
              'HX-Trigger',
              JSON.stringify({ close: { target: '#choose-game-server-dialog' } }),
            )
            .send()
        },
      )
      .get(
        '/games/:number/logs',
        {
          schema: {
            params: z.object({ number: gameNumber }),
          },
        },
        async (request, reply) => {
          const { number } = request.params
          const game = await games.findOne({ number })
          if (!game.logSecret) {
            return reply.status(404).send('No logs available for this game')
          }

          const log = await collections.gameLogs.findOne({ logSecret: game.logSecret })
          if (!log) {
            return reply.status(404).send('No logs available for this game')
          }

          const stream = Readable.from(log.logs).map(line => `${line}\n`)
          return await reply
            .header(
              'content-disposition',
              `attachment; filename=${environment.WEBSITE_NAME}-${number}.log`,
            )
            .type('text/plain')
            .send(stream)
        },
      )
  },
  {
    name: 'games routes',
  },
)
