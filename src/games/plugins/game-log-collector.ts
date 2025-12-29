import fp from 'fastify-plugin'
import { events } from '../../events'
import { collections } from '../../database/collections'
import { hideIpAddresses } from '../../utils/hide-ip-addresses'
import type { LogMessage } from '../../log-receiver/parse-log-message'
import { MongoError } from 'mongodb'

// When `gamelog:message` events come in quickly, their async handlers run concurrently.
// MongoDB `$push` is atomic, but concurrent updates can arrive at the server out of order,
// producing non-deterministic `logs[]` ordering. We serialize writes per `logSecret` to
// ensure logs are always appended in the exact order we receive them.
const perLogSecretQueue = new Map<string, Promise<unknown>>()

function enqueueByLogSecret<T>(logSecret: string, work: () => Promise<T>): Promise<T> {
  const previous = perLogSecretQueue.get(logSecret)
  const previousSettled = (previous ?? Promise.resolve()).catch(() => undefined)
  const next = previousSettled.then(work)

  perLogSecretQueue.set(logSecret, next)
  void next.finally(() => {
    if (perLogSecretQueue.get(logSecret) === next) {
      perLogSecretQueue.delete(logSecret)
    }
  })

  return next
}

// matches the gameserver restart line (kept in sync with match-event-listener)
const matchRestartedRegex =
  /^\d{2}\/\d{2}\/\d{4}\s-\s\d{2}:\d{2}:\d{2}:\srcon from ".+": command "exec etf2l_.+"$/

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
  // When the match is restarted, we want logs to start fresh. Handling this inline ensures
  // the prune is ordered relative to the log stream (and cannot race with subsequent lines).
  if (matchRestartedRegex.test(message.payload)) {
    await enqueueByLogSecret(message.password, async () => {
      await collections.gameLogs.deleteOne({ logSecret: message.password })
    })
    return
  }

  const logLine = hideIpAddresses(message.payload)

  await enqueueByLogSecret(message.password, async () => {
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
  })
}
