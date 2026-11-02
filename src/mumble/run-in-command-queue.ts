import { secondsToMilliseconds } from 'date-fns'
import { Mutex } from 'async-mutex'
import { delay } from 'es-toolkit'

// Mumble drops a client's messages past a small burst (5 by default, then 1 a second) without
// telling it, so the bot's commands would just time out
const spacing = secondsToMilliseconds(1)
const queue = new Mutex()

// ponytail: only the verification commands go through here; route the rest if they start timing out
export async function runInCommandQueue<T>(command: () => Promise<T>): Promise<T> {
  return await queue.runExclusive(async () => {
    try {
      return await command()
    } finally {
      await delay(spacing)
    }
  })
}
