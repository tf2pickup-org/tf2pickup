import { authUsers } from './auth-users'
import { mergeTests } from '@playwright/test'
import { simulateGameServer } from './simulate-game-server'
import type { UserContext } from '../user-manager'

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

export const launchGame = mergeTests(authUsers, simulateGameServer).extend<{
  gameNumber: number
  players: UserContext[]
}>({
  players: async ({ users }, use) => {
    const players = Array.from(desiredSlots.keys()).map(name => users.byName(name))
    await use(players)
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  gameNumber: async ({ users, players, gameServer }, use) => {
    if (users.count < 12) {
      throw new Error(`at least 12 users are required to launch a game`)
    }

    await Promise.all(
      players.map(async user => {
        const page = user.queuePage()
        const slot = desiredSlots.get(user.playerName)!
        await page.slot(slot).join()
        await page.readyUpDialog().readyUp()
        await user.page.waitForURL(/games\/(\d+)/)
      }),
    )

    const page = users.byName('Promenader').page
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

export { expect } from './simulate-game-server'
