import { secondsToMilliseconds } from 'date-fns'
import { launchGame as test, expect } from '../fixtures/launch-game'

test.use({ waitForStage: 'started' })
test.describe('substitutes', () => {
  test('substitute self', async ({ gameNumber, users, page, gameServer }) => {
    const admin = users.getAdmin()
    const adminsPage = await admin.gamePage(gameNumber)
    const mayflowersPage = await users.byName('Mayflower').gamePage(gameNumber)

    await expect(adminsPage.playerLink('Mayflower')).toBeVisible()
    await adminsPage.requestSubstitute('Mayflower')
    await expect(adminsPage.playerLink('Mayflower')).not.toBeVisible()
    await expect(gameServer).toHaveCommand(`say Looking for replacement for Mayflower...`, {
      timeout: secondsToMilliseconds(1),
    })

    await expect(adminsPage.gameEvent(`${admin.playerName} requested substitute`)).toBeVisible()
    await expect(adminsPage.playerLink('Mayflower')).not.toBeVisible()
    await expect(mayflowersPage.gameEvent(`${admin.playerName} requested substitute`)).toBeVisible()
    await expect(mayflowersPage.playerLink('Mayflower')).not.toBeVisible()

    await expect(
      page.getByText(`Team BLU needs a substitute for scout in game #${mayflowersPage.gameNumber}`),
    ).toBeVisible()

    await mayflowersPage.replacePlayer('Mayflower')

    await expect(adminsPage.playerLink('Mayflower')).toBeVisible()
    await expect(adminsPage.gameEvent(`Mayflower replaced Mayflower`)).toBeVisible()
    await expect(mayflowersPage.playerLink('Mayflower')).toBeVisible()
    await expect(mayflowersPage.gameEvent(`Mayflower replaced Mayflower`)).toBeVisible()
  })

  test('substitute other', async ({ gameNumber, users, page, gameServer }) => {
    const admin = users.getAdmin()
    const adminsPage = await admin.gamePage(gameNumber)
    const tommyGunsPage = await users.byName('TommyGun').gamePage(gameNumber)
    await tommyGunsPage.goto()

    await expect(adminsPage.playerLink('Mayflower')).toBeVisible()
    await adminsPage.requestSubstitute('Mayflower')
    await expect(adminsPage.playerLink('Mayflower')).not.toBeVisible()
    await expect(gameServer).toHaveCommand(`say Looking for replacement for Mayflower...`, {
      timeout: secondsToMilliseconds(1),
    })

    await expect(adminsPage.gameEvent(`${admin.playerName} requested substitute`)).toBeVisible()
    await expect(adminsPage.playerLink('Mayflower')).not.toBeVisible()
    await expect(tommyGunsPage.gameEvent(`${admin.playerName} requested substitute`)).toBeVisible()
    await expect(tommyGunsPage.playerLink('Mayflower')).not.toBeVisible()

    await expect(
      page.getByText(`Team BLU needs a substitute for scout in game #${adminsPage.gameNumber}`),
    ).toBeVisible()

    await tommyGunsPage.replacePlayer('Mayflower')

    await expect(adminsPage.playerLink('TommyGun')).toBeVisible()
    await expect(adminsPage.gameEvent(`TommyGun replaced Mayflower`)).toBeVisible()
    await expect(tommyGunsPage.playerLink('TommyGun')).toBeVisible()
    await expect(tommyGunsPage.gameEvent(`TommyGun replaced Mayflower`)).toBeVisible()

    await expect(gameServer).toHaveCommand(`sm_game_player_add ${users.byName('TommyGun').steamId}`)
    await expect(gameServer).toHaveCommand(
      `sm_game_player_del ${users.byName('Mayflower').steamId}`,
    )
    await expect(gameServer).toHaveCommand(`say Mayflower has been replaced by TommyGun`)
  })
})
