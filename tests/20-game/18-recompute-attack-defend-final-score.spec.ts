import { expect, launchGame } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'
import { logFixture } from '../fixtures/log-fixture'

launchGame.use({ waitForStage: 'started' })

// Replays the real log of https://logs.tf/4064166 (cp_steel_f12, attack/defend).
// TF2 reports a broken 0:0 final score. Blue capped everything in round 1 but
// the teams swapped sides, so when the round-2 attackers (also logged as "Blue")
// failed to beat the benchmark, the defending roster — now "Red" — won the last
// round and takes the map 0:1, matching logs.tf. This is the swap case the
// earlier capture-counting approach scored backwards.
launchGame(
  'recomputes the final score on an attack/defend map after a team swap @6v6 @9v9',
  async ({ gameNumber, page, gameServer }) => {
    const gamePage = new GamePage(page, gameNumber)
    await gamePage.goto()

    await gameServer.feedLogs(logFixture('cp_steel_4064166.log'))

    await expect(gamePage.page.getByLabel('blu team score')).toHaveText('0')
    await expect(gamePage.page.getByLabel('red team score')).toHaveText('1')
  },
)
