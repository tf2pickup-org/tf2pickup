import { z } from 'zod'
import { gameNumber } from '../../../../games/schemas/game-number'
import { DraftReplayPage } from '../../../../queue-captains/views/html/draft-replay.page'
import { routes } from '../../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        params: z.object({ number: gameNumber }),
      },
    },
    async (request, reply) => {
      await reply.status(200).html(DraftReplayPage({ gameNumber: request.params.number }))
    },
  )
})
