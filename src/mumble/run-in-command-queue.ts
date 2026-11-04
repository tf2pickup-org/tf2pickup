import { secondsToMilliseconds } from 'date-fns'
import { Mutex } from 'async-mutex'
import { delay } from 'es-toolkit'

// Mumble silently drops a client's rate-limited messages (ACL, ChannelState, TextMessage, UserState)
// past a small burst, 1 a second by default, so the bot's commands would just time out
const spacing = secondsToMilliseconds(1)
const queue = new Mutex()

// ponytail: only the verification commands go through here; route the rest if they start timing out
export async function runInCommandQueue<T>(command: () => Promise<T>, messages = 1): Promise<T> {
  return await queue.runExclusive(async () => {
    try {
      return await command()
    } finally {
      await delay(spacing * messages)
    }
  })
}
