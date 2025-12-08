import { PlayerRole } from '../../../database/models/player.model'
import { DocumentsPage } from '../../../admin/documents/views/html/documents.page'
import { z } from 'zod'
import { collections } from '../../../database/collections'
import { requestContext } from '@fastify/request-context'
import { routes } from '../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
      },
      async (_request, reply) => {
        reply.status(200).html(await DocumentsPage({ name: 'privacy policy' }))
      },
    )
    .post(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
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
        reply.status(200).html(await DocumentsPage({ name: 'privacy policy' }))
      },
    )
})
