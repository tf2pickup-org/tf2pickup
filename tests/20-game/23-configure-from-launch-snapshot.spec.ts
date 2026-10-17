import { secondsToMilliseconds } from 'date-fns'
import { expect, launchGame } from '../fixtures/launch-game'

launchGame.beforeAll(async ({ users }) => {
  await (await users.getAdmin().adminPage()).configureWhitelistId('e2e-launch-whitelist')
})

launchGame.afterAll(async ({ users }) => {
  await (await users.getAdmin().adminPage()).configureWhitelistId('')
})

launchGame.use({ waitForStage: 'launching' })
launchGame(
  'configures the game server with what was set when the game launched @6v6 @9v9',
  async ({ users, gameNumber, gameServer, request }) => {
    const admin = await users.getAdmin().adminPage()
    const { map } = (await (await request.get(`/api/v1/games/${gameNumber}`)).json()) as {
      map: string
    }
    const { execConfig } = (await admin.mapPool()).find(({ name }) => name === map)!

    await expect(gameServer).toHaveCommand(`exec ${execConfig}`)
    await expect(gameServer).toHaveCommand('tftrue_whitelist_id e2e-launch-whitelist')

    await admin.configureWhitelistId('e2e-changed-whitelist')
    gameServer.commands.splice(0)

    const gamePage = await users.getAdmin().gamePage(gameNumber)
    await gamePage.reinitializeGameServer()
    await expect(gamePage.gameEvent('Game server initialized')).toHaveCount(2, {
      timeout: secondsToMilliseconds(20),
    })
    await expect(gameServer).toHaveCommand(`exec ${execConfig}`)
    await expect(gameServer).toHaveCommand('tftrue_whitelist_id e2e-launch-whitelist')
    expect(gameServer.commands).not.toContain('tftrue_whitelist_id e2e-changed-whitelist')
  },
)
