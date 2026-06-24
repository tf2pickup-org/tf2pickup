import { launchGame as test, expect } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'

test.use({ waitForStage: 'launching' })

test.beforeAll(async ({ users }) => {
  const admin = await users.getAdmin().adminPage()
  await admin.configureHideServerInfo('never')
})

test.afterAll(async ({ users }) => {
  const admin = await users.getAdmin().adminPage()
  await admin.configureHideServerInfo('auto')
})

test('shows the stv connect string to spectators when enabled @6v6 @9v9', async ({
  gameNumber,
  page,
}) => {
  const gamePage = new GamePage(page, gameNumber)
  await gamePage.goto()
  await expect(gamePage.connectString()).toHaveText(/^connect ([a-z0-9\s.:]+)(;\s?password tv)?$/)
  await expect(gamePage.watchStvButton()).toBeVisible()
})
