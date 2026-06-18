import { expect, launchGame } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'
import { logFixture } from '../fixtures/log-fixture'

launchGame.use({ waitForStage: 'started' })

// Replays the real log of https://logs.tf/4071167 (pl_upward_f12), where TF2
// reports a broken 0:0 final score even though Blue capped the cart first. The
// score has to be recomputed from the control point captures to 1:0, matching
// what logs.tf derives.
launchGame(
  'recomputes the final score on a payload map reporting a broken 0:0 @6v6 @9v9',
  async ({ gameNumber, page, gameServer }) => {
    const gamePage = new GamePage(page, gameNumber)
    await gamePage.goto()

    await gameServer.feedLogs(logFixture('pl_upward_4071167.log'))

    await expect(gamePage.page.getByLabel('blu team score')).toHaveText('1')
    await expect(gamePage.page.getByLabel('red team score')).toHaveText('0')

    // the teams switch sides between the two stopwatch rounds, which is shown
    // as a "teams swapped" event in the game event timeline
    await expect(
      gamePage.page.getByLabel('Game events').getByText('Teams swapped sides'),
    ).toBeVisible()

    // per-round "Round ended" rows count captured control points, not the match
    // score, so they're meaningless on stopwatch maps and must be hidden
    await expect(gamePage.page.getByLabel('Game events').getByText('Round ended')).toHaveCount(0)
  },
)
