import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { PlayerRole } from '../../../database/models/player.model'
import { DocumentsPage } from '../../../admin/documents/views/html/documents.page'
import { z } from 'zod'
import { collections } from '../../../database/collections'
import { requestContext } from '@fastify/request-context'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .get(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
      },
      async (request, reply) => {
        reply.status(200).html(await DocumentsPage({ user: request.user!, name: 'privacy policy' }))
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
        reply.status(200).html(await DocumentsPage({ user: request.user!, name: 'privacy policy' }))
      },
    )
}
