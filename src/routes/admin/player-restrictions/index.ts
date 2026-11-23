import { PlayerRole } from '../../../database/models/player.model'
import { routes } from '../../../utils/routes'

// ponytail: kept for old bookmarks; these settings moved to Registration and Skill
// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get('/', { config: { authorize: [PlayerRole.admin] } }, async (_request, reply) => {
    await reply.redirect('/admin/registration', 301)
  })
})
