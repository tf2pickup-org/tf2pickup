import { expect, launchGame as test } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'

test.use({ waitForStage: 'started' })

test('handles match restart @6v6 @9v9', async ({ page, gameNumber, gameServer }) => {
  const gamePage = new GamePage(page, gameNumber)
  await gamePage.goto()

  await gameServer.roundEnds('blu')
  await expect(gamePage.page.getByLabel('blu team score')).toHaveText('1')

  // e.g. everyone goes to spectator, then both teams ready up again
  await gameServer.matchRestarts()
  await expect(gamePage.gameEvent('Game restarted')).toBeVisible()
  await expect(gamePage.page.getByLabel('blu team score')).toHaveText('0')
  await expect(gamePage.page.getByLabel('red team score')).toHaveText('0')
})
