import { launchGame, expect } from '../fixtures/launch-game'

launchGame('substitute self', async ({ gameNumber, users, page }) => {
  const admin = users.getAdmin()
  const adminsPage = await admin.gamePage(gameNumber)
  const mayflowersPage = await users.byName('Mayflower').gamePage(gameNumber)

  await expect(adminsPage.playerLink('Mayflower')).toBeVisible()
  await adminsPage.requestSubstitute('Mayflower')
  await expect(adminsPage.playerLink('Mayflower')).not.toBeVisible()

  await expect(adminsPage.gameEvent(`${admin.playerName} requested substitute`)).toBeVisible()
  await expect(adminsPage.playerLink('Mayflower')).not.toBeVisible()
  await expect(mayflowersPage.gameEvent(`${admin.playerName} requested substitute`)).toBeVisible()
  await expect(mayflowersPage.playerLink('Mayflower')).not.toBeVisible()

  await expect(
    page.getByText(`Team BLU needs a substitute for scout in game #${mayflowersPage.gameNumber}`),
  ).toBeVisible()

  await mayflowersPage.replacePlayer('Mayflower')

  await expect(adminsPage.playerLink('Mayflower')).toBeVisible()
  await expect(adminsPage.gameEvent(`Mayflower replaced Mayflower`)).toBeVisible()
  await expect(mayflowersPage.playerLink('Mayflower')).toBeVisible()
  await expect(mayflowersPage.gameEvent(`Mayflower replaced Mayflower`)).toBeVisible()
})
