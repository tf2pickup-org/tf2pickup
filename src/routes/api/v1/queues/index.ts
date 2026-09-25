import { routes } from '../../../../utils/routes'
import { queues } from '../../../../queues'
import { queueToDto } from '../../../../queues/views/json/queue-to-dto'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get('/', async (_req, reply) => {
    const enabled = await queues.listEnabled()
    return reply
      .type('application/hal+json')
      .status(200)
      .send({
        _links: { self: { href: '/api/v1/queues' } },
        _embedded: { queues: await Promise.all(enabled.map(queue => queueToDto(queue))) },
      })
  })
})
