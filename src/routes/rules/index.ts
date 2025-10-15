import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { collections } from '../../database/collections'
import { errors } from '../../errors'
import { DocumentPage } from '../../documents/views/html/document.page'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/', async (req, reply) => {
    const rules = await collections.documents.findOne({ name: 'rules' })
    if (rules === null) {
      throw errors.notFound('rules document not found')
    }

    reply.status(200).html(await DocumentPage(rules, req.user))
  })
}
