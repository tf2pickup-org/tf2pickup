import { expect } from '@playwright/test'
import { launchGame } from '../fixtures/launch-game'
import { waitABit } from '../utils/wait-a-bit'
import { secondsToMilliseconds } from 'date-fns'

launchGame(
  'free players when the game ends',
  async ({ steamIds, gameNumber, users, gameServer }) => {
    const gamePage = users.getFirst().gamePage(gameNumber)
    await expect(gamePage.gameEvent('Game server assigned')).toBeVisible()
    await expect(gamePage.gameEvent('Game server initialized')).toBeVisible({ timeout: 13000 })

    const queueUsers = steamIds.slice(0, 12)
    await Promise.all(
      queueUsers
        .map(steamId => users.bySteamId(steamId).queuePage())
        .map(async page => {
          await page.goto()
          await expect(page.goBackToGameLink()).toBeVisible()
        }),
    )

    await gameServer.connectAllPlayers()
    await gameServer.matchStarts()
    await waitABit(secondsToMilliseconds(10))
    await gameServer.matchEnds()

    await Promise.all(
      queueUsers
        .map(steamId => users.bySteamId(steamId).queuePage())
        .map(async page => {
          await page.goto()
          await expect(page.goBackToGameLink()).not.toBeVisible()
        }),
    )
  },
)
