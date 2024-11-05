import { secondsToMilliseconds } from 'date-fns'
import { GamePage } from '../pages/game.page'
import { expect, launchGame } from './launch-game'

export const launchGameAndInitialize = launchGame.extend({
  gameNumber: async ({ page, gameNumber }, use) => {
    const gamePage = new GamePage(page, gameNumber)
    await gamePage.goto()
    await expect(gamePage.gameEvent('Game server assigned')).toBeVisible()
    await expect(gamePage.gameEvent('Game server initialized')).toBeVisible({
      timeout: secondsToMilliseconds(15),
    })

    await use(gameNumber)
  },
})

export { expect } from '@playwright/test'
