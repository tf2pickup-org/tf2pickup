import { routes } from '../../../../utils/routes'
import { version } from '../../../../version'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get('/', async (_req, reply) => {
    return reply
      .type('application/hal+json')
      .status(200)
      .send({
        version,
        _links: {
          self: { href: '/api/v1/version' },
        },
      })
  })
})
