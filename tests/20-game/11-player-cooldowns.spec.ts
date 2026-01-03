import { secondsToMilliseconds } from 'date-fns'
import { expect, launchGame as test } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'

test.use({ waitForStage: 'launching' })

test.beforeEach(async ({ users }) => {
  const page = await users.getAdmin().adminPage()
  await page.configureGames({ joinGameServerTimeout: 10, rejoinGameServerTimeout: 5 })

  const adminsPage = await users.getAdmin().adminPage()
  await adminsPage.setPlayerCooldown(users.byName('SlitherTuft').steamId, 0)
})

test.describe('when a player gets auto-subbed @6v6 @9v9', () => {
  test.beforeEach(async ({ page, gameNumber, gameServer }) => {
    const gamePage = new GamePage(page, gameNumber)
    await gamePage.goto()
    await gameServer.connectAllPlayers()
    await gameServer.matchStarts()

    await gameServer.playerDisconnects('SlitherTuft')

    await expect
      .poll(() => gamePage.slot('SlitherTuft').status(), { timeout: secondsToMilliseconds(15) })
      .toBe('waiting for substitute')
    await expect(gamePage.playerLink('SlitherTuft')).not.toBeVisible()
  })

  test.describe('and they get replaced by other player @6v6 @9v9', () => {
    test.beforeEach(async ({ users, gameNumber }) => {
      const tommyGun = await users.byName('TommyGun').gamePage(gameNumber)
      await tommyGun.goto()
      await tommyGun.replacePlayer('SlitherTuft')
    })

    test('the cooldown is increased @6v6 @9v9', async ({ users }) => {
      const admin = await users.getAdmin().adminPage()
      const cooldown = await admin.playerCooldown(users.byName('SlitherTuft').steamId)
      await expect(cooldown).toHaveValue('1')
    })

    test.afterEach(async ({ users }) => {
      const adminsPage = await users.getAdmin().adminPage()
      await adminsPage.setPlayerCooldown(users.byName('SlitherTuft').steamId, 0)
      await adminsPage.revokeAllBans(users.byName('SlitherTuft').steamId)
    })
  })

  test.describe('and they replace themselves @6v6 @9v9', () => {
    test.beforeEach(async ({ users, gameNumber }) => {
      const tommyGun = await users.byName('SlitherTuft').gamePage(gameNumber)
      await tommyGun.goto()
      await tommyGun.replacePlayer('SlitherTuft')
    })

    test('the cooldown is not increased @6v6 @9v9', async ({ users }) => {
      const admin = await users.getAdmin().adminPage()
      const cooldown = await admin.playerCooldown(users.byName('SlitherTuft').steamId)
      await expect(cooldown).toHaveValue('0')
    })
  })
})
