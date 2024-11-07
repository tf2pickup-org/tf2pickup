import { expect } from '@playwright/test'
import { waitABit } from '../utils/wait-a-bit'
import { secondsToMilliseconds } from 'date-fns'
import { launchGameAndInitialize } from '../fixtures/launch-game-and-initialize'

launchGameAndInitialize(
  'free players when the game ends',
  async ({ players, gameNumber, gameServer }) => {
    await Promise.all(
      players
        .map(player => player.queuePage())
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
      players
        .map(player => player.queuePage())
        .map(async page => {
          await page.goto()
          await expect(page.goBackToGameLink()).not.toBeVisible()
        }),
    )
  },
)
