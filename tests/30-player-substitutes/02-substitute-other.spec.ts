import { launchGame, expect } from '../fixtures/launch-game'

launchGame('substitute other', async ({ gameNumber, users, page }) => {
  const admin = users.getAdmin()
  const mayflower = users.byName('Mayflower')
  const tommyGun = users.byName('TommyGun')

  const adminsPage = await admin.gamePage(gameNumber)
  const tommyGunsPage = await tommyGun.gamePage(gameNumber)
  await tommyGunsPage.goto()

  await expect(adminsPage.playerLink(mayflower.playerName)).toBeVisible()
  await adminsPage.requestSubstitute(mayflower.playerName)
  await expect(adminsPage.playerLink(mayflower.playerName)).not.toBeVisible()

  await expect(adminsPage.gameEvent(`${admin.playerName} requested substitute`)).toBeVisible()
  await expect(adminsPage.playerLink(mayflower.playerName)).not.toBeVisible()
  await expect(tommyGunsPage.gameEvent(`${admin.playerName} requested substitute`)).toBeVisible()
  await expect(tommyGunsPage.playerLink(mayflower.playerName)).not.toBeVisible()

  await expect(
    page.getByText(`Team BLU needs a substitute for scout in game #${adminsPage.gameNumber}`),
  ).toBeVisible()

  await tommyGunsPage.replacePlayer(mayflower.playerName)

  await expect(adminsPage.playerLink(tommyGun.playerName)).toBeVisible()
  await expect(
    adminsPage.gameEvent(`${tommyGun.playerName} replaced ${mayflower.playerName}`),
  ).toBeVisible()
  await expect(tommyGunsPage.playerLink(tommyGun.playerName)).toBeVisible()
  await expect(
    tommyGunsPage.gameEvent(`${tommyGun.playerName} replaced ${mayflower.playerName}`),
  ).toBeVisible()
})
