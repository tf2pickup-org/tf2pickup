import { Collection, MongoError } from 'mongodb'
import { hideIpAddresses } from '../utils/hide-ip-addresses'
import type { LogMessage } from '../log-receiver/parse-log-message'
import { noop } from 'es-toolkit'
import type { GameLogsModel } from '../database/models/game-logs.model'
import { collections } from '../database/collections'

class GameLogSink {
  private readonly queues = new Map<string, Promise<void>>()

  constructor(private readonly collection: Collection<GameLogsModel>) {}

  push(message: LogMessage): void {
    void this.enqueue(message.password, async () => {
      await this.safePushLogMessage(message)
    })
  }

  private enqueue(logSecret: string, operation: () => Promise<void>): Promise<void> {
    const previous = this.queues.get(logSecret) ?? Promise.resolve()
    const current = previous.then(operation)

    // Store a caught version to prevent unhandled rejection and to not break the chain
    this.queues.set(logSecret, current.catch(noop))
    return current
  }

  async waitForCompletion(logSecret: string): Promise<void> {
    const pending = this.queues.get(logSecret)
    if (pending) {
      await pending
    }
  }

  async clear(logSecret: string): Promise<void> {
    await this.enqueue(logSecret, async () => {
      await this.collection.deleteOne({ logSecret })
    })
  }

  private async safePushLogMessage(message: LogMessage) {
    const logLine = redact(message.payload)

    try {
      await this.collection.findOneAndUpdate(
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
        await this.collection.findOneAndUpdate(
          { logSecret: message.password },
          { $push: { logs: logLine } },
          { upsert: true },
        )
      } else {
        throw error
      }
    }
  }
}

function redact(message: string): string {
  return hideIpAddresses(message)
}

export const gameLogSink = new GameLogSink(collections.gameLogs)
