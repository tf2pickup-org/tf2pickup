import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { collections } from '../../database/collections'
import { DocumentPage } from '../../documents/views/html/document.page'
import { errors } from '../../errors'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/', async (req, reply) => {
    const doc = await collections.documents.findOne({ name: 'privacy policy' })
    if (doc === null) {
      throw errors.notFound('privacy policy document not found')
    }

    reply.status(200).html(await DocumentPage(doc, req.user))
  })
}
