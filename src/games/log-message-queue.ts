import { noop } from 'es-toolkit'

/**
 * Queue that ensures operations for the same key are executed sequentially.
 * Different keys can be processed concurrently.
 */
export class LogMessageQueue {
  private readonly queues = new Map<string, Promise<void>>()

  enqueue(key: string, operation: () => Promise<void>): void {
    const previous = this.queues.get(key) ?? Promise.resolve()
    const current = previous.then(operation)

    // Store a caught version to prevent unhandled rejection and to not break the chain
    this.queues.set(key, current.catch(noop))
  }

  async waitForCompletion(key: string): Promise<void> {
    const pending = this.queues.get(key)
    if (pending) {
      await pending
    }
  }

  clear(key: string): void {
    this.queues.delete(key)
  }
}

export const logMessageQueue = new LogMessageQueue()
