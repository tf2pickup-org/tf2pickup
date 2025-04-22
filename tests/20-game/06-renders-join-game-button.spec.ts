import { secondsToMilliseconds } from 'date-fns'
import { launchGame as test, expect } from '../fixtures/launch-game'

test.beforeEach(async ({ users }) => {
  const page = await users.getAdmin().adminPage()
  await page.configureGames({ joinGameServerTimeout: 30, rejoinGameServerTimeout: 20 })
})

test('renders join game button', async ({ gameNumber, users, gameServer }) => {
  const page = await users.byName('LlamaDrama').gamePage(gameNumber)
  await expect(page.waitingForGameServer()).toBeVisible()

  await expect(page.gameEvent('Game server initialized')).toBeVisible({
    timeout: secondsToMilliseconds(15),
  })

  const joinGameButton = page.joinGameButton()
  await expect(joinGameButton).toBeVisible()
  await expect(joinGameButton).toContainText(/join in \d+:\d+/)
  await gameServer.playerConnects('LlamaDrama')
  await expect(joinGameButton).toContainText('join game')
})
