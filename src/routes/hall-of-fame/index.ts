import { HallOfFamePage } from '../../hall-of-game/views/html/hall-of-fame.page'
import { routes } from '../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get('/', async (request, reply) => {
    reply.status(200).html(await HallOfFamePage({ user: request.user }))
  })
})
