import { secondsToMilliseconds } from 'date-fns'
import { launchGame as test } from '../fixtures/launch-game'
import { expect } from '../fixtures/expect'

test.use({ waitForStage: 'launching' })

test('reinitialize game server @6v6 @9v9', async ({ users, gameNumber }) => {
  const admin = users.getAdmin()
  const page = await admin.gamePage(gameNumber)
  await page.goto()

  await page.reinitializeGameServer()
  await expect(page.gameEvent(`Game reserver reinitialized by ${admin.playerName}`)).toBeVisible()
  await expect(page.gameEvent('Game server initialized')).toHaveCount(2, {
    timeout: secondsToMilliseconds(20),
  })
})
