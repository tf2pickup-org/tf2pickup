import fp from 'fastify-plugin'
import { events } from '../../events'
import { collections } from '../../database/collections'
import { hideIpAddresses } from '../../utils/hide-ip-addresses'
import type { LogMessage } from '../../log-receiver/parse-log-message'
import { MongoError } from 'mongodb'
import { findOne } from '../find-one'
import type { GameNumber } from '../../database/models/game.model'
import { logMessageQueue } from '../log-message-queue'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('gamelog:message', ({ message }) => {
      logMessageQueue.enqueue(message.password, async () => {
        await safePushLogMessage(message)
      })
    })
    events.on('match:restarted', async ({ gameNumber }) => {
      await pruneLogs(gameNumber)
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

async function pruneLogs(number: GameNumber) {
  const game = await findOne({ number }, ['logSecret'])
  if (!game.logSecret) {
    return
  }

  logMessageQueue.clear(game.logSecret)
  await collections.gameLogs.deleteOne({ logSecret: game.logSecret })
}
