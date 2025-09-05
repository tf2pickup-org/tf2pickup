import { expect, launchGame as test } from '../fixtures/launch-game'

test.use({ waitForStage: 'started' })
test('disable game page admin buttons after the game ends', async ({
  users,
  gameNumber,
  gameServer,
}) => {
  const admin = users.getAdmin()
  const page = await admin.gamePage(gameNumber)
  await page.goto()

  await expect(page.forceEndButton).toBeEnabled()
  await expect(page.reinitializeGameServerButton).toBeEnabled()
  await expect(page.reassignGameServerButton).toBeEnabled()

  await gameServer.matchEnds()

  await expect(page.forceEndButton).toBeDisabled()
  await expect(page.reinitializeGameServerButton).toBeDisabled()
  await expect(page.reassignGameServerButton).toBeDisabled()
})
