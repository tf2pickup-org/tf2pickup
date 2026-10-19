import { routes } from '../../../../utils/routes'
import { queues } from '../../../../queues'
import { queueToDto } from '../../../../queues/views/json/queue-to-dto'

// The default queue; kept for clients written before /api/v1/queues.
// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get('/', async (_req, reply) => {
    return reply
      .type('application/hal+json')
      .status(200)
      .send(await queueToDto(await queues.getDefault(), '/api/v1/queue'))
  })
})
