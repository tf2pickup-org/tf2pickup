import { collections } from '../../database/collections'
import { DocumentPage } from '../../documents/views/html/document.page'
import { errors } from '../../errors'
import { routes } from '../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get('/', async (_req, reply) => {
    const doc = await collections.documents.findOne({ name: 'privacy policy' })
    if (doc === null) {
      throw errors.notFound('privacy policy document not found')
    }

    reply.status(200).html(await DocumentPage(doc))
  })
})
