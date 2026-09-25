import { expect, launchGame } from '../fixtures/launch-game'
import { getQueueConfig } from '../queue-slots'

launchGame.use({ waitForStage: 'launching' })

launchGame.afterAll(async ({ users }) => {
  const admin = await users.getAdmin().adminPage()
  await admin.configureQueueWhitelistId('')
  await admin.configureGamemodeWhitelistId(getQueueConfig(), '')
  await admin.configureWhitelistId('')
})

launchGame.describe('with only the global whitelist set @multi-queue', () => {
  launchGame.beforeAll(async ({ users }) => {
    await (await users.getAdmin().adminPage()).configureWhitelistId('e2e-global')
  })

  launchGame('uses the global whitelist', async ({ gameNumber, gameServer }) => {
    expect(gameNumber).toBeGreaterThan(0)
    await expect(gameServer).toHaveCommand('tftrue_whitelist_id e2e-global')
  })
})

launchGame.describe('with a gamemode whitelist set @multi-queue', () => {
  launchGame.beforeAll(async ({ users }) => {
    const admin = await users.getAdmin().adminPage()
    await admin.configureWhitelistId('e2e-global')
    await admin.configureGamemodeWhitelistId(getQueueConfig(), 'e2e-gamemode')
  })

  launchGame('uses the gamemode whitelist', async ({ gameNumber, gameServer }) => {
    expect(gameNumber).toBeGreaterThan(0)
    await expect(gameServer).toHaveCommand('tftrue_whitelist_id e2e-gamemode')
    expect(gameServer.commands).not.toContain('tftrue_whitelist_id e2e-global')
  })
})

launchGame.describe("with the queue's own whitelist set @multi-queue", () => {
  launchGame.beforeAll(async ({ users }) => {
    const admin = await users.getAdmin().adminPage()
    await admin.configureWhitelistId('e2e-global')
    await admin.configureGamemodeWhitelistId(getQueueConfig(), 'e2e-gamemode')
    await admin.configureQueueWhitelistId('e2e-queue')
  })

  launchGame("uses the queue's whitelist", async ({ gameNumber, gameServer }) => {
    expect(gameNumber).toBeGreaterThan(0)
    await expect(gameServer).toHaveCommand('tftrue_whitelist_id e2e-queue')
    expect(gameServer.commands).not.toContain('tftrue_whitelist_id e2e-gamemode')
  })
})
