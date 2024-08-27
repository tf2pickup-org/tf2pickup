import { z } from 'zod'
import { standardAdminPage } from '../plugins/standard-admin-page'
import { GameServersPage } from './views/html/game-servers.page'

export default standardAdminPage({
  path: '/admin/game-servers',
  page: async user => await GameServersPage({ user }),
  bodySchema: z.object({}),
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  save: async () => {},
})
