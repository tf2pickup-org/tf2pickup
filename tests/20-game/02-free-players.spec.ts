import { expect } from '@playwright/test'
import { waitABit } from '../utils/wait-a-bit'
import { secondsToMilliseconds } from 'date-fns'
import { launchGameAndInitialize } from '../fixtures/launch-game-and-initialize'

launchGameAndInitialize(
  'free players when the game ends',
  async ({ steamIds, gameNumber, users, gameServer }) => {
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
    await waitABit(secondsToMilliseconds(3))
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
