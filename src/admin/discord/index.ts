import { z } from 'zod'
import { standardAdminPage } from '../standard-admin-page'
import { DiscordPage } from './views/html/discord.page'

export default standardAdminPage({
  path: '/admin/discord',
  page: async user => await DiscordPage({ user }),
  bodySchema: z.object({}),
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  save: async () => {},
})
