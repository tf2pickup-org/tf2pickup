import { authUsers } from './auth-users'
import { expect, mergeTests } from '@playwright/test'
import type { UserContext, UserName } from '../user-manager'
import { waitForEmptyQueue } from './wait-for-empty-queue'
import { GamePage } from '../pages/game.page'
import { minutesToMilliseconds } from 'date-fns'
import { getPlayerCount, getQueueConfig, type SlotId } from '../queue-slots'
import { desiredSlots6v6, desiredSlots9v9 } from './launch-game'

export { expect }

export interface LaunchGameServemeOptions {
  // Set to true to force-end the game after the test
  // Default: false — the game stays live so that a real TF2 client can connect
  killGame?: boolean

  // Wait for the specific game state before carrying on with the test
  // Default: 'launching'
  waitForStage:
    | 'created' // the game was created, but nothing is ready yet
    | 'launching' // a real serveme.tf server has been reserved and configured
}

export const launchGameServeme = mergeTests(authUsers, waitForEmptyQueue).extend<
  LaunchGameServemeOptions & {
    gameNumber: number
    players: UserContext[]
    desiredSlots: Map<UserName, SlotId>
  }
>({
  killGame: [false, { option: true }],
  waitForStage: ['launching', { option: true }],

  desiredSlots: async ({}, use) => {
    const slots = getQueueConfig() === '9v9' ? desiredSlots9v9 : desiredSlots6v6
    await use(new Map<UserName, SlotId>(slots))
  },
  players: async ({ users, desiredSlots }, use) => {
    const requiredCount = getPlayerCount()
    if (users.count < requiredCount) {
      throw new Error(`at least ${requiredCount} users are required to launch a game`)
    }

    const players = Array.from(desiredSlots.keys()).map(name => users.byName(name))
    await use(players)
  },
  gameNumber: [
    async ({ users, players, killGame, desiredSlots, waitForStage }, use) => {
      let gameNumber: number | undefined
      let setupCompleted = false

      try {
        const lastPlayer = players.at(-1)!
        const playersToReadyUp = players.slice(0, -1)
        const batchSize = 6
        for (let i = 0; i < playersToReadyUp.length; i += batchSize) {
          const batch = playersToReadyUp.slice(i, i + batchSize)
          await Promise.all(
            batch.map(async user => {
              const page = await user.queuePage()
              await page.goto()
              const slot = desiredSlots.get(user.playerName)!
              await page.slot(slot).join()
            }),
          )
        }

        // The player who fills the final slot is automatically readied by the queue.
        const lastQueuePage = await lastPlayer.queuePage()
        await lastQueuePage.goto()
        await lastQueuePage.slot(desiredSlots.get(lastPlayer.playerName)!).join()

        await Promise.all(
          players.map(async user => {
            const queuePage = await user.queuePage()
            const page = await user.page()
            const slot = desiredSlots.get(user.playerName)!

            if (user !== lastPlayer) {
              await queuePage.readyUp(slot)
            }
            await page.waitForURL(/games\/(\d+)/)
          }),
        )

        const page = await users.byName('Promenader').page()
        const matches = /games\/(\d+)/.exec(page.url())
        if (!matches) {
          throw new Error('could not launch game')
        }

        gameNumber = Number(matches[1])

        if (waitForStage === 'launching') {
          const gamePage = new GamePage(page, gameNumber)
          await gamePage.goto()
          await expect(gamePage.gameEvent('Game server assigned')).toBeVisible({
            timeout: minutesToMilliseconds(2),
          })
          await expect(gamePage.gameEvent('Game server initialized')).toBeVisible({
            timeout: minutesToMilliseconds(3),
          })
        }

        for (const user of players) {
          await user.dispose()
        }

        setupCompleted = true
        await use(gameNumber)
      } finally {
        try {
          const shouldCleanup = [killGame, !setupCompleted].includes(true)
          if (shouldCleanup && gameNumber === undefined) {
            for (const user of players) {
              const page = await user.page()
              const matches = /games\/(\d+)/.exec(page.url())
              if (matches) {
                gameNumber = Number(matches[1])
                break
              }
            }
          }

          if (shouldCleanup && gameNumber !== undefined) {
            const gamePage = await users.getAdmin().gamePage(gameNumber)
            await gamePage.goto()
            if (await gamePage.isLive()) {
              await gamePage.forceEnd()
            }
          } else if (shouldCleanup) {
            const queuePage = await users.getAdmin().queuePage()
            await queuePage.goto()
            await queuePage.clearQueue()
          }
        } finally {
          for (const user of players) {
            await user.dispose()
          }
        }
      }
    },
    { timeout: minutesToMilliseconds(6) },
  ],
})
