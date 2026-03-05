import z from 'zod'
import { routes } from '../../../../utils/routes'
import { collections } from '../../../../database/collections'
import { playerToDto } from '../dto/player-to-dto'

const querySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        querystring: querySchema,
      },
    },
    async (request, reply) => {
      const { offset, limit } = request.query
      const total = await collections.players.countDocuments()
      const players = await collections.players
        .find()
        .sort({ joinedAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray()

      const self = `/api/v1/players?offset=${offset}&limit=${limit}`
      const links: Record<string, { href: string }> = { self: { href: self } }
      if (offset + limit < total) {
        links['next'] = { href: `/api/v1/players?offset=${offset + limit}&limit=${limit}` }
      }
      if (offset > 0) {
        links['prev'] = {
          href: `/api/v1/players?offset=${Math.max(0, offset - limit)}&limit=${limit}`,
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
          _embedded: { players: players.map(playerToDto) },
        })
    },
  )
})
