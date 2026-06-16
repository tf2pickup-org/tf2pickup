import { expect, launchGame } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'
import { logFixture } from '../fixtures/log-fixture'

launchGame.use({ waitForStage: 'started' })

// Replays the real log of https://logs.tf/4072544 (koth_product_final). On koth
// (and cp) maps TF2 reports the final score correctly, so it must be left as-is
// (2:2) and never recomputed from control point captures.
launchGame(
  'keeps a correctly reported koth final score',
  async ({ gameNumber, page, gameServer }) => {
    const gamePage = new GamePage(page, gameNumber)
    await gamePage.goto()

    await gameServer.feedLogs(logFixture('koth_product_4072544.log'))

    await expect(gamePage.page.getByLabel('blu team score')).toHaveText('2')
    await expect(gamePage.page.getByLabel('red team score')).toHaveText('2')
  },
)
