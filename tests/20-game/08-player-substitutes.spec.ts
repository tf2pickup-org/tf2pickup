import { secondsToMilliseconds } from 'date-fns'
import { launchGame as test, expect } from '../fixtures/launch-game'

test.use({ waitForStage: 'started' })
test.describe('substitutes @6v6 @9v9', () => {
  test('substitute self @6v6 @9v9', async ({ gameNumber, users, page, gameServer }) => {
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
      page.getByText(`needs a substitute for scout in game #${mayflowersPage.gameNumber}`),
    ).toBeVisible()

    await mayflowersPage.replacePlayer('Mayflower')

    await expect(adminsPage.playerLink('Mayflower')).toBeVisible()
    await expect(adminsPage.gameEvent(`Mayflower replaced Mayflower`)).toBeVisible()
    await expect(mayflowersPage.playerLink('Mayflower')).toBeVisible()
    await expect(mayflowersPage.gameEvent(`Mayflower replaced Mayflower`)).toBeVisible()
  })

  test('substitute other @6v6 @9v9', async ({ gameNumber, users, page, gameServer }) => {
    const admin = users.getAdmin()
    const adminsPage = await admin.gamePage(gameNumber)
    const ghostWalkersPage = await users.byName('GhostWalker').gamePage(gameNumber)
    await ghostWalkersPage.goto()

    await expect(adminsPage.playerLink('Mayflower')).toBeVisible()
    await adminsPage.requestSubstitute('Mayflower')
    await expect(adminsPage.playerLink('Mayflower')).not.toBeVisible()
    await expect(gameServer).toHaveCommand(`say Looking for replacement for Mayflower...`, {
      timeout: secondsToMilliseconds(1),
    })

    await expect(adminsPage.gameEvent(`${admin.playerName} requested substitute`)).toBeVisible()
    await expect(adminsPage.playerLink('Mayflower')).not.toBeVisible()
    await expect(
      ghostWalkersPage.gameEvent(`${admin.playerName} requested substitute`),
    ).toBeVisible()
    await expect(ghostWalkersPage.playerLink('Mayflower')).not.toBeVisible()

    await expect(
      page.getByText(`needs a substitute for scout in game #${adminsPage.gameNumber}`),
    ).toBeVisible()

    await ghostWalkersPage.replacePlayer('Mayflower')

    await expect(adminsPage.playerLink('GhostWalker')).toBeVisible()
    await expect(adminsPage.gameEvent(`GhostWalker replaced Mayflower`)).toBeVisible()
    await expect(ghostWalkersPage.playerLink('GhostWalker')).toBeVisible()
    await expect(ghostWalkersPage.gameEvent(`GhostWalker replaced Mayflower`)).toBeVisible()

    await expect(gameServer).toHaveCommand(
      `sm_game_player_add ${users.byName('GhostWalker').steamId}`,
    )
    await expect(gameServer).toHaveCommand(
      `sm_game_player_del ${users.byName('Mayflower').steamId}`,
    )
    await expect(gameServer).toHaveCommand(`say Mayflower has been replaced by GhostWalker`)
  })
})
