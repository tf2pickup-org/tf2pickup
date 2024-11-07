import { launchGame, expect } from '../fixtures/launch-game'

launchGame('substitute self', async ({ gameNumber, users, page }) => {
  const admin = users.getAdmin()
  const adminsPage = admin.gamePage(gameNumber)
  const mayflower = users.byName('Mayflower')
  const mayflowersPage = mayflower.gamePage(gameNumber)

  await expect(adminsPage.playerLink(mayflower.playerName)).toBeVisible()
  await adminsPage.requestSubstitute(mayflower.playerName)
  await expect(adminsPage.playerLink(mayflower.playerName)).not.toBeVisible()

  await expect(adminsPage.gameEvent(`${admin.playerName} requested substitute`)).toBeVisible()
  await expect(adminsPage.playerLink(mayflower.playerName)).not.toBeVisible()
  await expect(mayflowersPage.gameEvent(`${admin.playerName} requested substitute`)).toBeVisible()
  await expect(mayflowersPage.playerLink(mayflower.playerName)).not.toBeVisible()

  await expect(
    page.getByText(`Team BLU needs a substitute for scout in game #${mayflowersPage.gameNumber}`),
  ).toBeVisible()

  await mayflowersPage.replacePlayer(mayflower.playerName)

  await expect(adminsPage.playerLink(mayflower.playerName)).toBeVisible()
  await expect(
    adminsPage.gameEvent(`${mayflower.playerName} replaced ${mayflower.playerName}`),
  ).toBeVisible()
  await expect(mayflowersPage.playerLink(mayflower.playerName)).toBeVisible()
  await expect(
    mayflowersPage.gameEvent(`${mayflower.playerName} replaced ${mayflower.playerName}`),
  ).toBeVisible()
})
