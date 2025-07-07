import fp from 'fastify-plugin'
import { version } from '../version'
import { type ZodTypeProvider, jsonSchemaTransform } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { queue } from '../queue'
import { QueueState } from '../database/models/queue-state.model'
import { collections } from '../database/collections'
import { gameNumber } from '../games/schemas/game-number'
import { games } from '../games'
import { gamePreviewSchema } from './schemas/game-preview.schema'
import { gameSchema } from './schemas/game.schema'
import { steamId64 } from '../shared/schemas/steam-id-64'
import { playerSchema } from './schemas/player.schema'
import { players } from '../players'
import { environment } from '../environment'

export default fp(async app => {
  await app.register(await import('@fastify/swagger'), {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'tf2pickup.org API',
        description: 'API documentation for tf2pickup.org',
        version,
      },
      servers: [
        {
          url: environment.WEBSITE_URL,
          description: environment.WEBSITE_NAME,
        },
      ],
      tags: [
        { name: 'queue', description: 'queue related end-points' },
        { name: 'games', description: 'games related end-points' },
        { name: 'players', description: 'players related end-points' },
      ],
    },
    transform: jsonSchemaTransform,
  })

  await app.register(import('@fastify/swagger-ui'), {
    routePrefix: '/api',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false,
    },
    staticCSP: true,
    transformSpecificationClone: true,
  })

  app
    .withTypeProvider<ZodTypeProvider>()
    .get(
      '/api/queue',
      {
        schema: {
          tags: ['queue'],
          response: {
            200: z.object({
              state: z.nativeEnum(QueueState),
              slots: z.array(
                z.object({
                  id: z.string(),
                  gameClass: z.string(),
                  player: z.string().nullable().describe('SteamId64'),
                  ready: z.boolean().describe('Is the player ready?'),
                  canMakeFriendsWith: z
                    .array(z.string())
                    .optional()
                    .describe('Array of gameClasses that this player can mark as friend'),
                }),
              ),
              mapVotes: z.record(z.string(), z.number()).describe('Map votes'),
            }),
          },
        },
      },
      async (_, reply) => {
        const state = await queue.getState()
        const slots = await queue.getSlots()
        const mapVotes = await queue.getMapVoteResults()
        reply.status(200).send({ state, slots, mapVotes })
      },
    )
    .get(
      '/api/games',
      {
        schema: {
          tags: ['games'],
          querystring: z.object({
            page: z.coerce.number().default(1),
          }),
          response: {
            200: z.object({
              games: z.array(gamePreviewSchema),
            }),
          },
        },
      },
      async (request, reply) => {
        const itemsPerPage = 10
        const { page } = request.query
        const skip = (page - 1) * itemsPerPage
        const games = (
          await collections.games
            .find({}, { limit: itemsPerPage, skip, sort: { 'events.0.at': -1 } })
            .toArray()
        ).map(game => ({
          ...game,
          launchedAt: new Date(game.events[0].at),
        }))
        reply.status(200).send({ games })
      },
    )
    .get(
      '/api/games/:number',
      {
        schema: {
          tags: ['games'],
          params: z.object({
            number: gameNumber,
          }),
          response: {
            200: gameSchema,
          },
        },
      },
      async (request, reply) => {
        const { number } = request.params
        const game = await games.findOne({ number })
        const launchedAt = new Date(game.events[0].at)
        reply.status(200).send({ ...game, gameServer: game.gameServer?.name, launchedAt })
      },
    )
    .get(
      '/api/players',
      {
        schema: {
          tags: ['players'],
          response: {
            200: z.array(playerSchema),
          },
        },
      },
      async (_, reply) => {
        const players = await collections.players.find().toArray()
        reply.status(200).send(players)
      },
    )
    .get(
      '/api/players/:steamId',
      {
        schema: {
          tags: ['players'],
          params: z.object({ steamId: steamId64 }),
          response: {
            200: playerSchema,
          },
        },
      },
      async (request, reply) => {
        const { steamId } = request.params
        const player = await players.bySteamId(steamId)
        reply.status(200).send(player)
      },
    )
})
