import { users } from '../data'
import { launchGame, expect } from '../fixtures/launch-game'

launchGame('substitute player', async ({ gamePages }) => {
  const admin = users[0]
  const page = gamePages.get(admin.steamId)!
  const mayflower = users[1]

  await expect(page.playerLink(mayflower.name)).toBeVisible()
  await page.requestSubstitute(mayflower.name)
  await expect(page.playerLink(mayflower.name)).not.toBeVisible()

  await Promise.all(
    Array.from(gamePages.values()).map(async page => {
      await expect(page.gameEvent(`${admin.name} requested substitute`)).toBeVisible()
      await expect(page.playerLink(mayflower.name)).not.toBeVisible()
    }),
  )
})
