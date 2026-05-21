import { MongoError } from 'mongodb'
import { collections } from '../database/collections'
import { hideIpAddresses } from '../utils/hide-ip-addresses'
import type { LogMessage } from '../log-receiver/parse-log-message'
import { noop } from 'es-toolkit'

class GameLogSink {
  private readonly queues = new Map<string, Promise<void>>()

  push(message: LogMessage): void {
    this.enqueue(message.password, async () => {
      await safePushLogMessage(message)
    })
  }

  private enqueue(logSecret: string, operation: () => Promise<void>): void {
    const previous = this.queues.get(logSecret) ?? Promise.resolve()
    const current = previous.then(operation)

    // Store a caught version to prevent unhandled rejection and to not break the chain
    this.queues.set(logSecret, current.catch(noop))
  }

  async waitForCompletion(logSecret: string): Promise<void> {
    const pending = this.queues.get(logSecret)
    if (pending) {
      await pending
    }
  }

  async clear(logSecret: string): Promise<void> {
    this.queues.delete(logSecret)
    await collections.gameLogs.deleteOne({ logSecret })
  }
}

async function safePushLogMessage(message: LogMessage) {
  const logLine = redact(message.payload)

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

function redact(message: string): string {
  return hideIpAddresses(message)
}

export const gameLogSink = new GameLogSink()
