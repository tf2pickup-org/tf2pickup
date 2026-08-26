import { DocumentsPage } from '../../../admin/documents/views/html/documents.page'
import { z } from 'zod'
import { collections } from '../../../database/collections'
import { requestContext } from '@fastify/request-context'
import { routes } from '../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get('/', async (_request, reply) => {
      await reply.status(200).html(DocumentsPage({ name: 'privacy policy' }))
    })
    .post(
      '/',
      {
        schema: {
          body: z.object({ body: z.string() }),
        },
      },
      async (request, reply) => {
        await collections.documents.updateOne(
          { name: 'privacy policy' },
          { $set: { body: request.body.body } },
        )
        requestContext.set('messages', { success: ['Configuration saved'] })
        await reply.status(200).html(DocumentsPage({ name: 'privacy policy' }))
      },
    )
})
