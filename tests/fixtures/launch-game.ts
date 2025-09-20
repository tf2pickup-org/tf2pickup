import { authUsers } from './auth-users'
import { expect, mergeTests } from '@playwright/test'
import { simulateGameServer } from './simulate-game-server'
import type { UserContext, UserName } from '../user-manager'
import { waitForEmptyQueue } from './wait-for-empty-queue'
import { GamePage } from '../pages/game.page'
import { secondsToMilliseconds } from 'date-fns'
import type { SlotId } from '../queue-slots'

export interface LaunchGameOptions {
  // Set to true to kill the game after the test
  // Default: true
  killGame?: boolean

  // Wait for the specific game state before carrying on with the test
  // Default: 'created'
  waitForStage:
    | 'created' // the game was created, but nothing is ready yet
    | 'launching' // the gameserver is configured, but the match hasn't started yet
    | 'started' // all players are connected and the match has started
}

export const launchGame = mergeTests(authUsers, simulateGameServer, waitForEmptyQueue).extend<
  LaunchGameOptions & {
    gameNumber: number
    players: UserContext[]
    desiredSlots: Map<UserName, SlotId>
  }
>({
  killGame: [true, { option: true }],
  waitForStage: ['created', { option: true }],

  desiredSlots: async ({}, use) => {
    await use(
      new Map<UserName, SlotId>([
        ['Promenader', 'scout-1'],
        ['Mayflower', 'scout-2'],
        ['Polemic', 'scout-3'],
        ['Shadowhunter', 'scout-4'],
        ['MoonMan', 'soldier-1'],
        ['Underfire', 'soldier-2'],
        ['Astropower', 'soldier-3'],
        ['LlamaDrama', 'soldier-4'],
        ['SlitherTuft', 'demoman-1'],
        ['Blacklight', 'demoman-2'],
        ['AstraGirl', 'medic-1'],
        ['BellBoy', 'medic-2'],
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
  gameNumber: async ({ users, players, gameServer, killGame, desiredSlots, waitForStage }, use) => {
    await gameServer.sendHeartbeat()

    await Promise.all(
      players.map(async user => {
        const page = await user.queuePage()
        await page.goto()
        const slot = desiredSlots.get(user.playerName)!
        await page.slot(slot).join()
        await page.readyUpDialog().readyUp()
        await (await user.page()).waitForURL(/games\/(\d+)/)
      }),
    )

    const page = await users.byName('Promenader').page()
    const matches = /games\/(\d+)/.exec(page.url())
    if (!matches) {
      throw new Error('could not launch game')
    }

    const gameNumber = Number(matches[1])

    if (['launching', 'started'].includes(waitForStage)) {
      const gamePage = new GamePage(page, gameNumber)
      await gamePage.goto()
      await expect(gamePage.gameEvent('Game server assigned')).toBeVisible()
      await expect(gamePage.gameEvent('Game server initialized')).toBeVisible({
        timeout: secondsToMilliseconds(15),
      })

      if (waitForStage === 'started') {
        await gameServer.connectAllPlayers()
        await gameServer.matchStarts()
      }
    }

    await use(gameNumber)

    if (!killGame) {
      return
    }

    // kill the game if it's live
    const gamePage = await users.getAdmin().gamePage(gameNumber)
    await gamePage.goto()
    if (await gamePage.isLive()) {
      if (waitForStage === 'started') {
        await gameServer.matchEnds()
      } else {
        await gamePage.forceEnd()
      }
    }

    const adminPage = await users.getAdmin().adminPage()
    await adminPage.freeStaticGameServer()
  },
})

export { expect } from './simulate-game-server'
