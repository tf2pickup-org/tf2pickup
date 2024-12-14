import { secondsToMilliseconds } from 'date-fns'
import { expect, launchGameAndStartMatch } from '../fixtures/launch-game-and-start-match'

launchGameAndStartMatch('manages in-game', async ({ gameNumber, users, gameServer }) => {
  const admin = users.getAdmin()

  const adminsPage = await admin.gamePage(gameNumber)
  const tommyGunsPage = await users.byName('TommyGun').gamePage(gameNumber)
  await tommyGunsPage.goto()

  await expect(adminsPage.playerLink('Mayflower')).toBeVisible()
  await adminsPage.requestSubstitute('Mayflower')

  await expect(gameServer).toHaveCommand(`say Looking for replacement for Mayflower...`, {
    timeout: secondsToMilliseconds(1),
  })

  await tommyGunsPage.replacePlayer('Mayflower')

  await expect(gameServer).toHaveCommand(`sm_game_player_add ${users.byName('TommyGun').steamId}`)
  await expect(gameServer).toHaveCommand(`sm_game_player_del ${users.byName('Mayflower').steamId}`)
  await expect(gameServer).toHaveCommand(`say Mayflower has been replaced by TommyGun`)
})
