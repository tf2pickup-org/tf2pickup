import { launchGame as test } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'
import { logFixture } from '../fixtures/log-fixture'
import { expect } from '../fixtures/expect'

test.use({ waitForStage: 'started' })

// Replays the real log of https://logs.tf/4072522 (cp_gullywash_f9, a 6v6 5cp
// map). TF2 reports the final score correctly here (2:3), both teams capture
// points, so the score must be tracked as-is and never recomputed.
test('keeps a correctly reported 5cp final score @6v6 @9v9', async ({
  gameNumber,
  page,
  gameServer,
}) => {
  const gamePage = new GamePage(page, gameNumber)
  await gamePage.goto()

  await gameServer.feedLogs(logFixture('cp_gullywash_4072522.log'))

  await expect(gamePage.teamScore('blu')).toHaveText('2')
  await expect(gamePage.teamScore('red')).toHaveText('3')
})
