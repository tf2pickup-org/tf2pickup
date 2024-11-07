import { authUsers } from './auth-users'
import { mergeTests } from '@playwright/test'
import { simulateGameServer } from './simulate-game-server'

export const launchGame = mergeTests(authUsers, simulateGameServer).extend<{
  gameNumber: number
}>({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  gameNumber: async ({ users, gameServer }, use) => {
    if (users.count < 12) {
      throw new Error(`at least 12 users are required to launch a game`)
    }

    const desiredSlots = new Map<string, number>([
      ['Promenader', 0],
      ['Mayflower', 1],
      ['Polemic', 2],
      ['Shadowhunter', 3],
      ['MoonMan', 4],
      ['Underfire', 5],
      ['Astropower', 6],
      ['LlamaDrama', 7],
      ['SlitherTuft', 8],
      ['Blacklight', 9],
      ['AstraGirl', 10],
      ['BellBoy', 11],
    ])

    const queueUsers = users.getMany(12)
    await Promise.all(
      queueUsers
        .map(user => ({ page: user.queuePage(), slot: desiredSlots.get(user.playerName)! }))
        .map(async ({ page, slot }) => {
          await page.slot(slot).join()
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
