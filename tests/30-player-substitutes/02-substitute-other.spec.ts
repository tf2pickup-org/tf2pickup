import { launchGame, expect } from '../fixtures/launch-game'

launchGame('substitute other', async ({ gameNumber, users, page }) => {
  const admin = users.getAdmin()
  const adminsPage = await admin.gamePage(gameNumber)
  const tommyGunsPage = await users.byName('TommyGun').gamePage(gameNumber)
  await tommyGunsPage.goto()

  await expect(adminsPage.playerLink('Mayflower')).toBeVisible()
  await adminsPage.requestSubstitute('Mayflower')
  await expect(adminsPage.playerLink('Mayflower')).not.toBeVisible()

  await expect(adminsPage.gameEvent(`${admin.playerName} requested substitute`)).toBeVisible()
  await expect(adminsPage.playerLink('Mayflower')).not.toBeVisible()
  await expect(tommyGunsPage.gameEvent(`${admin.playerName} requested substitute`)).toBeVisible()
  await expect(tommyGunsPage.playerLink('Mayflower')).not.toBeVisible()

  await expect(
    page.getByText(`Team BLU needs a substitute for scout in game #${adminsPage.gameNumber}`),
  ).toBeVisible()

  await tommyGunsPage.replacePlayer('Mayflower')

  await expect(adminsPage.playerLink('TommyGun')).toBeVisible()
  await expect(adminsPage.gameEvent(`TommyGun replaced Mayflower`)).toBeVisible()
  await expect(tommyGunsPage.playerLink('TommyGun')).toBeVisible()
  await expect(tommyGunsPage.gameEvent(`TommyGun replaced Mayflower`)).toBeVisible()
})
