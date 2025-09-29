import fp from 'fastify-plugin'
import { events } from '../../events'
import { collections } from '../../database/collections'
import { hideIpAddresses } from '../../utils/hide-ip-addresses'
import type { LogMessage } from '../../log-receiver/parse-log-message'
import { MongoError } from 'mongodb'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('gamelog:message', async ({ message }) => {
      await safePushLogMessage(message)
    })
  },
  { name: 'game log collector', encapsulate: true },
)

async function safePushLogMessage(message: LogMessage) {
  const logLine = hideIpAddresses(message.payload)

  try {
    await collections.gameLogs.findOneAndUpdate(
      { logSecret: message.password },
      { $push: { logs: logLine } },
      { upsert: true },
    )
  } catch (error) {
    if (!(error instanceof MongoError)) {
      throw error
    }

    if (error.code === 11000) {
      // Another upsert occurred during the upsert, try again.
      await collections.gameLogs.findOneAndUpdate(
        { logSecret: message.password },
        { $push: { logs: logLine } },
        { upsert: true },
      )
    } else {
      throw error
    }
  }
}
