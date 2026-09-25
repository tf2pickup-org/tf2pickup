import { authUsers } from './auth-users'
import { expect, mergeTests } from '@playwright/test'
import { simulateGameServer } from './simulate-game-server'
import type { UserContext, UserName } from '../user-manager'
import { waitForEmptyQueue } from './wait-for-empty-queue'
import { GamePage } from '../pages/game.page'
import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'
import { getQueueConfig, type SlotId } from '../queue-slots'

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

  // Launch the game through this queue instead of the default one
  // Default: undefined
  queue: { slug: string; gamemode: string } | undefined
}

const desiredSlots6v6: [UserName, SlotId][] = [
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
]

const desiredSlots9v9: [UserName, SlotId][] = [
  ['Promenader', 'scout-1'],
  ['Mayflower', 'scout-2'],
  ['Polemic', 'soldier-1'],
  ['Shadowhunter', 'soldier-2'],
  ['MoonMan', 'pyro-1'],
  ['Underfire', 'pyro-2'],
  ['Astropower', 'demoman-1'],
  ['LlamaDrama', 'demoman-2'],
  ['SlitherTuft', 'heavy-1'],
  ['Blacklight', 'heavy-2'],
  ['AstraGirl', 'engineer-1'],
  ['BellBoy', 'engineer-2'],
  ['TommyGun', 'medic-1'],
  ['NeonBlitz', 'medic-2'],
  ['CrazyComet', 'sniper-1'],
  ['FrostByte', 'sniper-2'],
  ['IronViper', 'spy-1'],
  ['ShadowPulse', 'spy-2'],
]

const desiredSlotsByGamemode: Record<string, [UserName, SlotId][]> = {
  '6v6': desiredSlots6v6,
  '9v9': desiredSlots9v9,
  ultiduo: [
    ['Promenader', 'soldier-1'],
    ['Mayflower', 'soldier-2'],
    ['Polemic', 'medic-1'],
    ['Shadowhunter', 'medic-2'],
  ],
  bball: [
    ['Promenader', 'soldier-1'],
    ['Mayflower', 'soldier-2'],
    ['Polemic', 'soldier-3'],
    ['Shadowhunter', 'soldier-4'],
  ],
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
  queue: [undefined, { option: true }],

  desiredSlots: async ({ queue }, use) => {
    await use(
      new Map<UserName, SlotId>(desiredSlotsByGamemode[queue?.gamemode ?? getQueueConfig()]),
    )
  },
  players: async ({ users, desiredSlots }, use) => {
    const requiredCount = desiredSlots.size
    if (users.count < requiredCount) {
      throw new Error(`at least ${requiredCount} users are required to launch a game`)
    }

    const players = Array.from(desiredSlots.keys()).map(name => users.byName(name))
    await use(players)
  },
  gameNumber: [
    async ({ users, players, gameServer, killGame, desiredSlots, waitForStage, queue }, use) => {
      let gameNumber: number | undefined
      let setupCompleted = false

      try {
        await gameServer.sendHeartbeat()

        const lastPlayer = players.at(-1)!
        const playersToReadyUp = players.slice(0, -1)
        const batchSize = 6
        for (let i = 0; i < playersToReadyUp.length; i += batchSize) {
          const batch = playersToReadyUp.slice(i, i + batchSize)
          await Promise.all(
            batch.map(async user => {
              const page = await user.queuePage(queue?.slug)
              await page.goto()
              const slot = desiredSlots.get(user.playerName)!
              await page.slot(slot).join()
            }),
          )
        }

        // The player who fills the final slot is automatically readied by the queue.
        const lastQueuePage = await lastPlayer.queuePage(queue?.slug)
        await lastQueuePage.goto()
        await lastQueuePage.slot(desiredSlots.get(lastPlayer.playerName)!).join()

        await Promise.all(
          players.map(async user => {
            const queuePage = await user.queuePage(queue?.slug)
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

        if (['launching', 'started'].includes(waitForStage)) {
          const gamePage = new GamePage(page, gameNumber)
          await gamePage.goto()
          await expect(gamePage.gameEvent('Game server assigned')).toBeVisible()
          await expect(gamePage.gameEvent('Game server initialized')).toBeVisible({
            timeout: secondsToMilliseconds(45),
          })

          if (waitForStage === 'started') {
            await gameServer.connectAllPlayers()
            await gameServer.matchStarts()
          }
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
              if (waitForStage === 'started') {
                await gameServer.matchEnds()
              } else {
                await gamePage.forceEnd()
              }
            }

            await expect
              .poll(() => gameServer.logAddresses.size === 0, {
                message: 'make sure logaddress is cleared',
                timeout: secondsToMilliseconds(40),
              })
              .toBe(true)

            const adminPage = await users.getAdmin().adminPage()
            await adminPage.freeStaticGameServer()
          } else if (shouldCleanup) {
            const queuePage = await users.getAdmin().queuePage(queue?.slug)
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
    { timeout: minutesToMilliseconds(2) },
  ],
})

export { expect } from './simulate-game-server'
