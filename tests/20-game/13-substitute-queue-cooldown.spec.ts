import { expect } from '@playwright/test'
import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'
import { launchGame as test } from '../fixtures/launch-game'
import { queueSlots } from '../queue-slots'

test.use({ waitForStage: 'started' })

test('substitute players skip the queue cooldown @6v6 @9v9', async ({
  users,
  gameNumber,
  gameServer,
}) => {
  test.setTimeout(minutesToMilliseconds(1))

  const admin = users.getAdmin()
  const adminsPage = await admin.gamePage(gameNumber)
  await adminsPage.requestSubstitute('Mayflower')

  const ghostWalker = users.byName('GhostWalker')
  const ghostWalkersGamePage = await ghostWalker.gamePage(gameNumber)
  await ghostWalkersGamePage.replacePlayer('Mayflower')
  await expect(ghostWalkersGamePage.gameEvent('GhostWalker replaced Mayflower')).toBeVisible()

  // open both queue pages before ending the match so both checks start at the same time
  const slitherTuftsQueuePage = await users.byName('SlitherTuft').queuePage()
  await slitherTuftsQueuePage.goto()

  const ghostWalkersQueuePage = await ghostWalker.queuePage()
  await ghostWalkersQueuePage.goto()

  await gameServer.matchEnds()

  await Promise.all([
    // the substitute (GhostWalker) should be freed with no cooldown
    expect(ghostWalkersQueuePage.goBackToGameLink()).not.toBeVisible({
      timeout: secondsToMilliseconds(2),
    }),
    ...Array.from(queueSlots()).map(slot =>
      expect(ghostWalkersQueuePage.slot(slot).joinButton()).toBeEnabled({
        timeout: secondsToMilliseconds(2),
      }),
    ),
    // a regular non-substitute player (SlitherTuft, demoman) should still be on cooldown
    expect(slitherTuftsQueuePage.goBackToGameLink()).toBeVisible({
      timeout: secondsToMilliseconds(1),
    }),
    ...Array.from(queueSlots()).map(slot =>
      expect(slitherTuftsQueuePage.slot(slot).joinButton()).toBeDisabled({
        timeout: secondsToMilliseconds(1),
      }),
    ),
  ])
})
