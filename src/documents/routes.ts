import fp from 'fastify-plugin'
import { collections } from '../database/collections'
import { DocumentPage } from './views/html/document.page'
import { errors } from '../errors'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app
      .get('/rules', async (req, reply) => {
        const rules = await collections.documents.findOne({ name: 'rules' })
        if (rules === null) {
          throw errors.notFound('rules document not found')
        }

        reply.status(200).html(await DocumentPage(rules, req.user))
      })
      .get('/privacy-policy', async (req, reply) => {
        const doc = await collections.documents.findOne({ name: 'privacy policy' })
        if (doc === null) {
          throw errors.notFound('privacy policy document not found')
        }

        reply.status(200).html(await DocumentPage(doc, req.user))
      })
  },
  {
    name: 'documents routes',
  },
)
