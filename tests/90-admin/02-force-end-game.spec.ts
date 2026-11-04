import { launchGame as test } from '../fixtures/launch-game'
import { expect } from '../fixtures/expect'

test('force end game @6v6 @9v9', async ({ users, gameNumber }) => {
  const admin = users.getAdmin()
  const adminsPage = await admin.gamePage(gameNumber)
  await adminsPage.goto()

  await adminsPage.forceEnd()
  await expect(adminsPage.gameEvent(`Game interrupted by ${admin.playerName}`)).toBeVisible()
})
