import { secondsToMilliseconds } from 'date-fns'
import { expect, launchGame } from '../fixtures/launch-game'
import type { GameServerSimulator } from '../game-server-simulator'
import { GamePage } from '../pages/game.page'

const test = launchGame.extend({
  gameServer: async ({}, use) => {
    await use({
      sendHeartbeat: async () => {
        return Promise.resolve()
      },
      logAddresses: new Set<string>(),
    } as GameServerSimulator)
  },
})

test.use({ waitForStage: 'created' })

test('handles match restart', async ({ page, gameNumber }) => {
  const gamePage = new GamePage(page, gameNumber)
  await gamePage.goto()
  await expect(gamePage.gameEvent('No free servers available')).toBeVisible({
    timeout: secondsToMilliseconds(30),
  })
})
