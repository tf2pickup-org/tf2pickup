import { users } from '../data'
import { expect, launchGame } from '../fixtures/launch-game'

launchGame('force end game', async ({ gamePages }) => {
  const admin = users[0]
  const adminsPage = gamePages.get(admin.steamId)!

  await adminsPage.forceEnd()
  await expect(adminsPage.gameEvent(`Game interrupted by ${admin.name}`)).toBeVisible()
})
