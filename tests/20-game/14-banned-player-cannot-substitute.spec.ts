import { expect } from '@playwright/test'
import { launchGame as test } from '../fixtures/launch-game'

test.use({ waitForStage: 'started' })

test('banned players do not see the take-substitute-spot button @6v6 @9v9', async ({
  gameNumber,
  users,
}) => {
  const admin = users.getAdmin()
  const adminsPage = await admin.gamePage(gameNumber)
  await adminsPage.requestSubstitute('Mayflower')

  const ghostWalker = users.byName('GhostWalker')
  const adminPage = await admin.adminPage()
  await adminPage.banPlayer(ghostWalker.steamId, { reason: 'testing' })

  const ghostWalkersPage = await ghostWalker.gamePage(gameNumber)
  await expect(
    ghostWalkersPage.playerSlot('Mayflower').getByRole('button', { name: 'Replace player' }),
  ).not.toBeVisible()

  await adminPage.revokeAllBans(ghostWalker.steamId)
})
