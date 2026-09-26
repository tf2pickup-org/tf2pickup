import { expect } from '@playwright/test'
import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'
import { launchGame as test } from '../fixtures/launch-game'
import { queueSlots } from '../queue-slots'

test.use({ waitForStage: 'started' })

test('self-substituting players have the same queue cooldown as regular players @6v6 @9v9', async ({
  users,
  gameNumber,
  gameServer,
}) => {
  test.setTimeout(minutesToMilliseconds(1))

  const admin = users.getAdmin()
  const adminsPage = await admin.gamePage(gameNumber)
  await adminsPage.requestSubstitute('Mayflower')

  const mayflower = users.byName('Mayflower')
  const mayflowersGamePage = await mayflower.gamePage(gameNumber)
  await mayflowersGamePage.replacePlayer('Mayflower')
  await expect(mayflowersGamePage.gameEvent('Mayflower replaced Mayflower')).toBeVisible()

  const mayflowersQueuePage = await mayflower.queuePage()
  await mayflowersQueuePage.goto()

  await gameServer.matchEnds()

  // the self-substituting player (Mayflower) should be on the same cooldown as a regular player
  await Promise.all([
    expect(mayflowersQueuePage.goBackToGameLink()).toBeVisible({
      timeout: secondsToMilliseconds(1),
    }),
    ...Array.from(queueSlots()).map(slot =>
      expect(mayflowersQueuePage.slot(slot).joinButton()).toBeDisabled({
        timeout: secondsToMilliseconds(1),
      }),
    ),
  ])
})

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

  const slitherTuftsQueuePage = await users.byName('SlitherTuft').queuePage()
  await slitherTuftsQueuePage.goto()

  const ghostWalkersQueuePage = await ghostWalker.queuePage()
  await ghostWalkersQueuePage.goto()

  await gameServer.matchEnds()

  // the substitute (GhostWalker) is freed as soon as the game ends; how soon that is depends on
  // how fast the game end is processed, so it is compared with a regular player's cooldown
  await expect(ghostWalkersQueuePage.goBackToGameLink()).not.toBeVisible({
    timeout: secondsToMilliseconds(15),
  })
  // a regular player (SlitherTuft, demoman) is still on their cooldown at that point
  await Promise.all([
    expect(slitherTuftsQueuePage.goBackToGameLink()).toBeVisible({
      timeout: secondsToMilliseconds(1),
    }),
    ...Array.from(queueSlots()).map(slot =>
      expect(slitherTuftsQueuePage.slot(slot).joinButton()).toBeDisabled({
        timeout: secondsToMilliseconds(1),
      }),
    ),
  ])

  await Promise.all(
    Array.from(queueSlots()).map(slot =>
      expect(ghostWalkersQueuePage.slot(slot).joinButton()).toBeEnabled(),
    ),
  )
})
