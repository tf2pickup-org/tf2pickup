import { expect, launchGame } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'
import { logFixture } from '../fixtures/log-fixture'

launchGame.use({ waitForStage: 'started' })

// Replays the real log of https://logs.tf/4056794 (cp_snakewater_final1, a 6v6
// 5cp map). Two rounds end in a stalemate, so there is no Round_Win between
// two Round_Starts. The replay re-stamps all lines to the current second — the
// post-stalemate Round_Start must not be mistaken for the doubled Round_Start
// of a match restart.
launchGame(
  'does not mistake stalemate rounds for a match restart @6v6 @9v9',
  async ({ gameNumber, page, gameServer }) => {
    const gamePage = new GamePage(page, gameNumber)
    await gamePage.goto()

    await gameServer.feedLogs(logFixture('cp_snakewater_4056794.log'))

    await expect(gamePage.page.getByLabel('blu team score')).toHaveText('2')
    await expect(gamePage.page.getByLabel('red team score')).toHaveText('1')
    await expect(gamePage.gameEvent('Game restarted')).not.toBeVisible()
  },
)
