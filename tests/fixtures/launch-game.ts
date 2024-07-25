import { authUsers } from './auth-users'
import { users } from '../data'
import { Mutex } from 'async-mutex'
import { GamePage } from '../pages/game.page'

export const launchGame = authUsers.extend<{
  gamePages: Map<string, GamePage>
}>({
  gamePages: async ({ pages, steamIds }, use, testInfo) => {
    if (pages.size < 12) {
      throw new Error(`at least 12 users are required to launch a game`)
    }

    const queueUsers = steamIds.slice(0, 12)

    const gamePages = new Map<string, GamePage>()
    const mutex = new Mutex()
    await Promise.all(
      queueUsers.map(async (user, i) => {
        const page = pages.get(user)!

        await mutex.runExclusive(async () => {
          // join the queue
          await page.getByLabel(`Join queue on slot ${i}`, { exact: true }).click()
        })

        // last player joining the queue is ready by default
        if (i !== 11) {
          // wait for ready-up
          await page.getByRole('button', { name: `I'M READY` }).click()
        }

        await page.waitForURL(/games\/(\d+)/)
        gamePages.set(user, new GamePage(page))
      }),
    )

    await use(gamePages)

    if (testInfo.status !== testInfo.expectedStatus) {
      const admin = users.find(u => 'roles' in u && u.roles.includes('admin'))!
      const adminPage = gamePages.get(admin.steamId)!
      await adminPage.forceEnd()
    }
  },
})

export { expect } from '@playwright/test'
