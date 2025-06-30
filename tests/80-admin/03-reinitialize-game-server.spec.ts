import { secondsToMilliseconds } from 'date-fns'
import { expect, launchGame } from '../fixtures/launch-game'

launchGame.use({ waitForStage: 'launching' })

launchGame('reinitialize game server', async ({ users, gameNumber }) => {
  const admin = users.getAdmin()
  const page = await admin.gamePage(gameNumber)
  await page.goto()

  await page.reinitializeGameServer()
  await expect(page.gameEvent(`Game reserver reinitialized by ${admin.playerName}`)).toBeVisible()
  await expect(page.gameEvent('Game server initialized')).toHaveCount(2, {
    timeout: secondsToMilliseconds(20),
  })
})
