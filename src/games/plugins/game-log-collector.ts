import fp from 'fastify-plugin'
import { events } from '../../events'
import { collections } from '../../database/collections'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('gamelog:message', async ({ message }) => {
      await collections.gameLogs.findOneAndUpdate(
        { logSecret: message.password },
        { $push: { messages: message.payload } },
        { upsert: true },
      )
    })
  },
  { name: 'game log collector', encapsulate: true },
)
