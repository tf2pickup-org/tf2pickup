import { authUsers } from './auth-users'
import { users } from '../data'
import { Mutex } from 'async-mutex'
import { GamePage } from '../pages/game.page'
import { mergeTests } from '@playwright/test'
import { simulateGameServer } from './simulate-game-server'

export const launchGame = mergeTests(authUsers, simulateGameServer).extend<{
  gameNumber: number
}>({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  gameNumber: async ({ pages, steamIds, gameServer }, use, testInfo) => {
    if (pages.size < 12) {
      throw new Error(`at least 12 users are required to launch a game`)
    }

    const queueUsers = steamIds.slice(0, 12)

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
      }),
    )

    const firstPage = pages.get(users[0].steamId)!
    const matches = firstPage.url().match(/games\/(\d+)/)
    if (matches) {
      const gameNumber = Number(matches[1])
      await use(gameNumber)

      if (testInfo.status !== testInfo.expectedStatus) {
        const admin = users.find(u => 'roles' in u && u.roles.includes('admin'))!
        const adminPage = new GamePage(pages.get(admin.steamId)!, gameNumber)
        await adminPage.goto()
        if ((await adminPage.gameStatus().textContent())?.toLowerCase() === 'live') {
          await adminPage.forceEnd()
        }
      }
    } else {
      throw new Error('could not launch game')
    }
  },
})

export { expect } from '@playwright/test'
