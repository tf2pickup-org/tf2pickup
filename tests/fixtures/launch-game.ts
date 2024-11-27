import { authUsers } from './auth-users'
import { mergeTests } from '@playwright/test'
import { simulateGameServer } from './simulate-game-server'
import type { UserContext } from '../user-manager'

export interface LaunchGameOptions {
  // Set to true to kill the game after the test
  // Default: true
  killGame?: boolean
}

export const launchGame = mergeTests(authUsers, simulateGameServer).extend<
  LaunchGameOptions & {
    gameNumber: number
    players: UserContext[]
    desiredSlots: Map<string, number>
  }
>({
  killGame: [true, { option: true }],
  desiredSlots: async ({}, use) => {
    await use(
      new Map<string, number>([
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
      ]),
    )
  },
  players: async ({ users, desiredSlots }, use) => {
    if (users.count < 12) {
      throw new Error(`at least 12 users are required to launch a game`)
    }

    const players = Array.from(desiredSlots.keys()).map(name => users.byName(name))
    await use(players)
  },
  gameNumber: async ({ users, players, gameServer, killGame, desiredSlots }, use) => {
    await gameServer.sendHeartbeat()

    await Promise.all(
      players.map(async user => {
        const page = await user.queuePage()
        const slot = desiredSlots.get(user.playerName)!
        await page.slot(slot).join()
        await page.readyUpDialog().readyUp()
        await (await user.page()).waitForURL(/games\/(\d+)/)
      }),
    )

    const page = await users.byName('Promenader').page()
    const matches = page.url().match(/games\/(\d+)/)
    if (matches) {
      const gameNumber = Number(matches[1])
      await use(gameNumber)

      if (!killGame) {
        return
      }

      // kill the game if it's live
      const adminPage = await users.getAdmin().gamePage(gameNumber)
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
