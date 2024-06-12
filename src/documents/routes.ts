import fp from 'fastify-plugin'
import { collections } from '../database/collections'
import { DocumentPage } from './views/html/document.page'

export default fp(
  async app => {
    app.get('/rules', async (req, reply) => {
      const rules = await collections.documents.findOne({ name: 'rules' })
      if (rules === null) {
        reply.status(404).send()
        return
      }

      reply.status(200).html(await DocumentPage(rules, req.user))
    })
  },
  {
    name: 'documents routes',
  },
)
