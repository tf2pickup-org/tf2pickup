import { PlayerListPage } from '../../players/views/html/player-list.page'
import { routes } from '../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get('/', async (_req, reply) => {
    reply.status(200).html(await PlayerListPage())
  })
})
