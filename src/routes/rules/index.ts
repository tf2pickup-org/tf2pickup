import { collections } from '../../database/collections'
import { errors } from '../../errors'
import { DocumentPage } from '../../documents/views/html/document.page'
import { routes } from '../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get('/', async (req, reply) => {
    const rules = await collections.documents.findOne({ name: 'rules' })
    if (rules === null) {
      throw errors.notFound('rules document not found')
    }

    reply.status(200).html(await DocumentPage(rules, req.user))
  })
})
