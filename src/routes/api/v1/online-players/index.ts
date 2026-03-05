import { routes } from '../../../../utils/routes'
import { collections } from '../../../../database/collections'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get('/', async (_req, reply) => {
    const players = await collections.onlinePlayers.find().toArray()

    return reply
      .type('application/hal+json')
      .status(200)
      .send({
        count: players.length,
        _links: { self: { href: '/api/v1/online-players' } },
        _embedded: {
          players: players.map(p => ({
            steamId: p.steamId,
            name: p.name,
            avatar: p.avatar,
            _links: { self: { href: `/api/v1/players/${p.steamId}` } },
          })),
        },
      })
  })
})
