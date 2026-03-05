import { routes } from '../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get('/', async (_req, reply) => {
    return reply
      .type('application/hal+json')
      .status(200)
      .send({
        _links: {
          self: { href: '/api/v1' },
          players: { href: '/api/v1/players' },
          games: { href: '/api/v1/games' },
          queue: { href: '/api/v1/queue' },
          onlinePlayers: { href: '/api/v1/online-players' },
          version: { href: '/api/v1/version' },
        },
      })
  })
})
