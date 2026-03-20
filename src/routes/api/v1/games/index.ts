import z from 'zod'
import { routes } from '../../../../utils/routes'
import { collections } from '../../../../database/collections'
import { GameState } from '../../../../database/models/game.model'
import { gameToDto } from '../../../../games/views/json/game-to-dto'

const querySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  state: z.enum(GameState).optional(),
})

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get('/', { schema: { querystring: querySchema } }, async (request, reply) => {
    const { offset, limit, state } = request.query
    const filter = state ? { state } : {}
    const total = await collections.games.countDocuments(filter)
    const gamesList = await collections.games
      .find(filter, {
        projection: {
          number: 1,
          map: 1,
          state: 1,
          score: 1,
          logsUrl: 1,
          demoUrl: 1,
          events: 1,
          'gameServer.name': 1,
          'gameServer.provider': 1,
        },
      })
      .sort({ number: -1 })
      .skip(offset)
      .limit(limit)
      .toArray()

    const stateParam = state ? `&state=${state}` : ''
    const self = `/api/v1/games?offset=${offset}&limit=${limit}${stateParam}`
    const links: Record<string, { href: string }> = { self: { href: self } }
    if (offset + limit < total) {
      links['next'] = {
        href: `/api/v1/games?offset=${offset + limit}&limit=${limit}${stateParam}`,
      }
    }
    if (offset > 0) {
      links['prev'] = {
        href: `/api/v1/games?offset=${Math.max(0, offset - limit)}&limit=${limit}${stateParam}`,
      }
    }

    return reply
      .type('application/hal+json')
      .status(200)
      .send({
        total,
        offset,
        limit,
        _links: links,
        _embedded: { games: gamesList.map(gameToDto) },
      })
  })
})
