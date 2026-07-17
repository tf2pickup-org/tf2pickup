import { expect, launchGame } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'
import { logFixture } from '../fixtures/log-fixture'

launchGame.use({ waitForStage: 'started' })

// Replays the real log of https://logs.tf/4084159 (cp_process_f12, a 6v6 5cp
// map). The doubled Round_Start at the match start straddles a second boundary
// (16:35:01 / 16:35:02) — it must be recognized as the initial match start
// doubling, not a mid-game restart, and the score must be kept as-is.
launchGame(
  'handles a match start doubled across a second boundary @6v6 @9v9',
  async ({ gameNumber, page, gameServer }) => {
    const gamePage = new GamePage(page, gameNumber)
    await gamePage.goto()

    await gameServer.feedLogs(logFixture('cp_process_4084159.log'))

    await expect(gamePage.page.getByLabel('red team score')).toHaveText('5')
    await expect(gamePage.page.getByLabel('blu team score')).toHaveText('1')
    await expect(gamePage.gameEvent('Game restarted')).not.toBeVisible()
  },
)
