import { launchGame as test } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'
import { expect } from '../fixtures/expect'

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

test('confirms copying the connect string @6v6 @9v9', async ({ gameNumber, page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  const gamePage = new GamePage(page, gameNumber)
  await gamePage.goto()
  const button = gamePage.copyConnectStringButton()
  await expect(button).toHaveAccessibleName('Copy connect string')
  await button.click()
  await expect(button).toHaveAccessibleName('Copied')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^connect /)
  await expect(button).toHaveAccessibleName('Copy connect string')
})
