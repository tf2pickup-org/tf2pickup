import { users } from '../data'
import { launchGame, expect } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'

launchGame('substitute self', async ({ gamePages, pages }) => {
  const admin = users[0]
  const mayflower = users[1]
  const tommyGun = users[12]

  const adminsPage = gamePages.get(admin.steamId)!
  const tommyGunsPage = await (async () => {
    const p = pages.get(tommyGun.steamId)!
    await p.goto(adminsPage.page.url())
    return new GamePage(p)
  })()

  await expect(adminsPage.playerLink(mayflower.name)).toBeVisible()
  await adminsPage.requestSubstitute(mayflower.name)
  await expect(adminsPage.playerLink(mayflower.name)).not.toBeVisible()

  await Promise.all(
    Array.from(gamePages.values()).map(async page => {
      await expect(page.gameEvent(`${admin.name} requested substitute`)).toBeVisible()
      await expect(page.playerLink(mayflower.name)).not.toBeVisible()
    }),
  )

  await tommyGunsPage.replacePlayer(mayflower.name)
  await Promise.all(
    Array.from(gamePages.values()).map(async page => {
      await expect(page.playerLink(tommyGun.name)).toBeVisible()
      await expect(page.gameEvent(`${tommyGun.name} replaced ${mayflower.name}`)).toBeVisible()
    }),
  )

  await adminsPage.forceEnd()
})
