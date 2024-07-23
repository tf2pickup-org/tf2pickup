import { users } from '../data'
import { launchGame, expect } from '../fixtures/launch-game'

launchGame('substitute player', async ({ gamePages }) => {
  const admin = gamePages.get(users[0].steamId)!
  await expect(admin.playerLink(users[1].name)).toBeVisible()
  await admin.requestSubstitute(users[1].name)
  await expect(admin.playerLink(users[1].name)).not.toBeVisible()

  await Promise.all(
    Array.from(gamePages.values()).map(async page => {
      await expect(page.gameEvent(`${users[0].name} requested substitute`)).toBeVisible()
      await expect(page.playerLink(users[1].name)).not.toBeVisible()
    }),
  )
})
