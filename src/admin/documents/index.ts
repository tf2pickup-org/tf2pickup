import fp from 'fastify-plugin'
import { standardAdminPage } from '../standard-admin-page'
import { z } from 'zod'
import { collections } from '../../database/collections'
import { DocumentsPage } from './views/html/documents.page'

const rules = standardAdminPage({
  path: '/admin/rules',
  bodySchema: z.object({ body: z.string() }),
  save: async ({ body }) => {
    await collections.documents.updateOne({ name: 'rules' }, { $set: { body } })
  },
  page: async user => await DocumentsPage({ user, name: 'rules' }),
})

const privacyPolicy = standardAdminPage({
  path: '/admin/privacy-policy',
  bodySchema: z.object({ body: z.string() }),
  save: async ({ body }) => {
    await collections.documents.updateOne({ name: 'privacy policy' }, { $set: { body } })
  },
  page: async user => await DocumentsPage({ user, name: 'privacy policy' }),
})

export default fp(
  async app => {
    await app.register(rules)
    await app.register(privacyPolicy)
  },
  {
    name: 'admin panel - documents',
  },
)
