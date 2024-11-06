import { expect, launchGame } from '../fixtures/launch-game'

launchGame('force end game', async ({ users, gameNumber }) => {
  const admin = users.getAdmin()
  const adminsPage = admin.gamePage(gameNumber)

  await adminsPage.forceEnd()
  await expect(adminsPage.gameEvent(`Game interrupted by ${admin.playerName}`)).toBeVisible()
})
