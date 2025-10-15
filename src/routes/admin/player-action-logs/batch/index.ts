import { PlayerRole } from '../../../../database/models/player.model'
import { z } from 'zod'
import { getLogs } from '../../../../admin/player-action-logs/get-logs'
import { LogEntryList } from '../../../../admin/player-action-logs/views/html/log-entry-list'
import { routes } from '../../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      config: {
        authorize: [PlayerRole.superUser],
      },
      schema: {
        querystring: z.object({
          before: z.string().transform(val => new Date(Number(val))),
        }),
      },
    },
    async (request, reply) => {
      const { before } = request.query
      const logs = await getLogs({ before })
      return reply.status(200).send(await LogEntryList({ logs }))
    },
  )
})
