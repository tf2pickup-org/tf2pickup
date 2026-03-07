import { z } from 'zod'
import { StatisticsPage } from '../../statistics/views/html/statistics.page'
import { gameLaunchesPerDaySpans } from '../../statistics/views/html/game-launches-per-day'
import { routes } from '../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        querystring: z.object({
          span: z.enum(gameLaunchesPerDaySpans).optional().default('month'),
        }),
      },
    },
    async (request, reply) => {
      reply.status(200).html(await StatisticsPage({ span: request.query.span }))
    },
  )
})
