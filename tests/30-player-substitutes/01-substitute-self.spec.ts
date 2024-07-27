import { users } from '../data'
import { launchGame, expect } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'

launchGame('substitute self', async ({ gameNumber, pages, page }) => {
  const admin = users[0]
  const mayflower = users[1]
  const adminsPage = new GamePage(pages.get(admin.steamId)!, gameNumber)
  const mayflowersPage = new GamePage(pages.get(mayflower.steamId)!, gameNumber)

  await expect(adminsPage.playerLink(mayflower.name)).toBeVisible()
  await adminsPage.requestSubstitute(mayflower.name)
  await expect(adminsPage.playerLink(mayflower.name)).not.toBeVisible()

  await expect(adminsPage.gameEvent(`${admin.name} requested substitute`)).toBeVisible()
  await expect(adminsPage.playerLink(mayflower.name)).not.toBeVisible()
  await expect(mayflowersPage.gameEvent(`${admin.name} requested substitute`)).toBeVisible()
  await expect(mayflowersPage.playerLink(mayflower.name)).not.toBeVisible()

  await expect(
    page.getByText(`Team BLU needs a substitute for scout in game #${mayflowersPage.gameNumber}`),
  ).toBeVisible()

  await mayflowersPage.replacePlayer(mayflower.name)

  await expect(adminsPage.playerLink(mayflower.name)).toBeVisible()
  await expect(adminsPage.gameEvent(`${mayflower.name} replaced ${mayflower.name}`)).toBeVisible()
  await expect(mayflowersPage.playerLink(mayflower.name)).toBeVisible()
  await expect(
    mayflowersPage.gameEvent(`${mayflower.name} replaced ${mayflower.name}`),
  ).toBeVisible()

  await adminsPage.forceEnd()
})
