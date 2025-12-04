import { routes } from "../../../utils/routes"
import { PlayerSkillTablePage } from "../../../admin/player-skill-table/views/html/player-skill-table.page"

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get('/', async (request, reply) => {
    reply.html(await PlayerSkillTablePage({ user: request.user! }))
  })
})
