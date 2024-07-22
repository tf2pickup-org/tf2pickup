import { users } from '../data'
import { launchGame, expect } from '../fixtures/launch-game'

launchGame('substitute self', async ({ gamePages }) => {
  const admin = users[0]
  const mayflower = users[1]
  const adminsPage = gamePages.get(admin.steamId)!
  const mayflowersPage = gamePages.get(mayflower.steamId)!

  await expect(adminsPage.playerLink(mayflower.name)).toBeVisible()
  await adminsPage.requestSubstitute(mayflower.name)
  await expect(adminsPage.playerLink(mayflower.name)).not.toBeVisible()

  await Promise.all(
    Array.from(gamePages.values()).map(async page => {
      await expect(page.gameEvent(`${admin.name} requested substitute`)).toBeVisible()
      await expect(page.playerLink(mayflower.name)).not.toBeVisible()
    }),
  )

  await mayflowersPage.replacePlayer(mayflower.name)
  await Promise.all(
    Array.from(gamePages.values()).map(async page => {
      await expect(page.playerLink(mayflower.name)).toBeVisible()
      await expect(page.gameEvent(`${mayflower.name} replaced ${mayflower.name}`)).toBeVisible()
    }),
  )
})
