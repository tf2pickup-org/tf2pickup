import { expect, launchGame as test } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'

test.use({ waitForStage: 'started' })

test('handles match restart @6v6 @9v9', async ({ page, gameNumber, gameServer }) => {
  const gamePage = new GamePage(page, gameNumber)
  await gamePage.goto()
  gameServer.log('rcon from "0.0.0.0:35610": command "exec etf2l_6v6_5cp"')
  await expect(gamePage.gameEvent('Game restarted')).toBeVisible()

  await gameServer.matchStarts()
  await expect(gamePage.gameEvent('Game started')).toHaveCount(2)
})
