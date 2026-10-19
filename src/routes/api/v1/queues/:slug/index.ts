import { z } from 'zod'
import { errors } from '../../../../../errors'
import { queues } from '../../../../../queues'
import { queueToDto } from '../../../../../queues/views/json/queue-to-dto'
import { routes } from '../../../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get('/', { schema: { params: z.object({ slug: z.string() }) } }, async (request, reply) => {
    const queue = await queues.bySlug(request.params.slug)
    if (!queue.enabled) {
      throw errors.notFound(`queue ${queue.slug} is not enabled`)
    }
    return reply
      .type('application/hal+json')
      .status(200)
      .send(await queueToDto(queue))
  })
})
