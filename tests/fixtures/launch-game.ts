import { authUsers } from './auth-users'
import { users, type User } from '../data'
import { Mutex } from 'async-mutex'
import { GamePage } from '../pages/game.page'

interface QueueUser extends User {
  slotId: number
}

const queueUsers: QueueUser[] = users.map((user, i) => ({ ...user, slotId: i }))

export const launchGame = authUsers(...queueUsers.map(u => u.steamId)).extend<{
  gamePages: Map<string, GamePage>
}>({
  gamePages: async ({ pages }, use) => {
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

    const gamePages = new Map(Array.from(pages, ([steamId, page]) => [steamId, new GamePage(page)]))
    await use(gamePages)
  },
})

export { expect } from '@playwright/test'
