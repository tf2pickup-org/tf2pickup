import { authUsers } from './auth-users'
import { mergeTests } from '@playwright/test'
import { simulateGameServer } from './simulate-game-server'

export const launchGame = mergeTests(authUsers, simulateGameServer).extend<{
  gameNumber: number
}>({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  gameNumber: async ({ users, steamIds, gameServer }, use) => {
    if (users.count < 12) {
      throw new Error(`at least 12 users are required to launch a game`)
    }

    const queueUsers = steamIds.slice(0, 12)
    await Promise.all(
      queueUsers
        .map(steamId => users.bySteamId(steamId).queuePage())
        .map(async (page, i) => {
          await page.slot(i).join()
          await page.readyUpDialog().readyUp()
          await page.page.waitForURL(/games\/(\d+)/)
        }),
    )

    const page = users.getFirst().page
    const matches = page.url().match(/games\/(\d+)/)
    if (matches) {
      const gameNumber = Number(matches[1])
      await use(gameNumber)

      // kill the game if it's live
      const adminPage = users.getAdmin().gamePage(gameNumber)
      await adminPage.goto()
      if (await adminPage.isLive()) {
        await adminPage.forceEnd()
      }
    } else {
      throw new Error('could not launch game')
    }
  },
})

export { expect } from '@playwright/test'
