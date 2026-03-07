import { z } from 'zod'
import {
  GameLaunchesPerDay,
  gameLaunchesPerDaySpans,
} from '../../../statistics/views/html/game-launches-per-day'
import { routes } from '../../../utils/routes'

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
      const { span } = request.query
      reply.header('HX-Push-Url', `/statistics?span=${span}`)
      reply.status(200).html(await GameLaunchesPerDay({ span }))
    },
  )
})
