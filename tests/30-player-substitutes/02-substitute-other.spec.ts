import { users } from '../data'
import { launchGame, expect } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'

launchGame('substitute other', async ({ gameNumber, pages, page }) => {
  const admin = users[0]
  const mayflower = users[1]
  const tommyGun = users[12]

  const adminsPage = new GamePage(pages.get(admin.steamId)!, gameNumber)
  const tommyGunsPage = new GamePage(pages.get(tommyGun.steamId)!, gameNumber)
  await tommyGunsPage.goto()

  await expect(adminsPage.playerLink(mayflower.name)).toBeVisible()
  await adminsPage.requestSubstitute(mayflower.name)
  await expect(adminsPage.playerLink(mayflower.name)).not.toBeVisible()

  await expect(adminsPage.gameEvent(`${admin.name} requested substitute`)).toBeVisible()
  await expect(adminsPage.playerLink(mayflower.name)).not.toBeVisible()
  await expect(tommyGunsPage.gameEvent(`${admin.name} requested substitute`)).toBeVisible()
  await expect(tommyGunsPage.playerLink(mayflower.name)).not.toBeVisible()

  await expect(
    page.getByText(`Team BLU needs a substitute for scout in game #${adminsPage.gameNumber}`),
  ).toBeVisible()

  await tommyGunsPage.replacePlayer(mayflower.name)

  await expect(adminsPage.playerLink(tommyGun.name)).toBeVisible()
  await expect(adminsPage.gameEvent(`${tommyGun.name} replaced ${mayflower.name}`)).toBeVisible()
  await expect(tommyGunsPage.playerLink(tommyGun.name)).toBeVisible()
  await expect(tommyGunsPage.gameEvent(`${tommyGun.name} replaced ${mayflower.name}`)).toBeVisible()

  await adminsPage.forceEnd()
})
