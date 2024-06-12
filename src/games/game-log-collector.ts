import fp from 'fastify-plugin'
import { events } from '../events'
import { collections } from '../database/collections'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async () => {
  events.on('gamelog:message', async message => {
    await collections.gameLogs.findOneAndUpdate(
      { logSecret: message.password },
      { $push: { messages: message.payload } },
      { upsert: true },
    )
  })
})
