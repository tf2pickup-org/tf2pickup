import { z } from 'zod'
import { routes } from '../../../utils/routes'
import { QueueState } from '../../../database/models/queue-state.model'
import { queue } from '../../../queue'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        tags: ['queue'],
        response: {
          200: z.object({
            state: z.enum(QueueState),
            slots: z.array(
              z.object({
                id: z.string(),
                gameClass: z.string(),
                player: z.string().nullable().describe('SteamId64'),
                ready: z.boolean().describe('Is the player ready?'),
                canMakeFriendsWith: z
                  .array(z.string())
                  .optional()
                  .describe('Array of gameClasses that this player can mark as friend'),
              }),
            ),
            mapVotes: z.record(z.string(), z.number()).describe('Map votes'),
          }),
        },
      },
    },
    async (_, reply) => {
      const state = await queue.getState()
      const slots = await queue.getSlots()
      const mapVotes = await queue.getMapVoteResults()
      reply.status(200).send({ state, slots, mapVotes })
    },
  )
})
