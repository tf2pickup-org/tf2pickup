import { expect, launchGame } from '../fixtures/launch-game'

launchGame('force end game', async ({ users, gameNumber }) => {
  const admin = users.getAdmin()
  const adminsPage = await admin.gamePage(gameNumber)
  await adminsPage.goto()

  await adminsPage.forceEnd()
  await expect(adminsPage.gameEvent(`Game interrupted by ${admin.playerName}`)).toBeVisible()
})
