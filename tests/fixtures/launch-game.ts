import { mergeTests, type Page } from '@playwright/test'
import { authUsers } from './auth-users'
import { users, type User } from '../data'
import { simulateGameServer } from './simulate-game-server'
import { GameServerSimulator } from '../game-server-simulator'
import { Mutex } from 'async-mutex'

interface QueueUser extends User {
  slotId: number
}

const queueUsers: QueueUser[] = users.map((user, i) => ({ ...user, slotId: i }))

export const launchGame = mergeTests(
  authUsers(...queueUsers.map(u => u.steamId)),
  simulateGameServer,
).extend<{ gameServer: GameServerSimulator; pages: Map<string, Page>; gameNumber: number }>({
  gameNumber: async ({ pages }, use) => {
    const mutex = new Mutex()

    await Promise.all(
      queueUsers.map(async user => {
        const page = pages.get(user.steamId)!

        await mutex.runExclusive(async () => {
          // join the queue
          await page.getByLabel(`Join queue on slot ${user.slotId}`, { exact: true }).click()
        })

        // last player joining the queue is ready by default
        if (user.slotId !== 11) {
          // wait for ready-up
          await page.getByRole('button', { name: `I'M READY` }).click()
        }

        await page.waitForURL(/games\/(\d+)/)
      }),
    )

    const firstPage = pages.get(users[0].steamId)!
    const matches = firstPage.url().match(/games\/(\d+)/)
    if (matches) {
      const gameNumber = Number(matches[1])
      await use(gameNumber)
    } else {
      throw new Error('could not launch game')
    }
  },
})

export { expect } from '@playwright/test'
