import { z } from 'zod'
import {
  GameLaunchesPerDay,
  type GameLaunchesPerDaySpan,
} from '../../../statistics/views/html/game-launches-per-day'
import { routes } from '../../../utils/routes'

export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        querystring: z.object({
          span: z
            .enum(['week', 'month', 'year'] satisfies [
              GameLaunchesPerDaySpan,
              GameLaunchesPerDaySpan,
              GameLaunchesPerDaySpan,
            ])
            .optional()
            .default('month'),
        }),
      },
    },
    async (request, reply) => {
      const { span } = request.query
      reply.status(200).html(await GameLaunchesPerDay({ span }))
    },
  )
})
