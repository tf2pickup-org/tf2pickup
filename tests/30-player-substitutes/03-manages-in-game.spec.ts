import { secondsToMilliseconds } from 'date-fns'
import { expect, launchGameAndStartMatch } from '../fixtures/launch-game-and-start-match'

launchGameAndStartMatch('manages in-game', async ({ gameNumber, users, gameServer }) => {
  const admin = users.getAdmin()
  const mayflower = users.byName('Mayflower')
  const tommyGun = users.byName('TommyGun')

  const adminsPage = admin.gamePage(gameNumber)
  const tommyGunsPage = tommyGun.gamePage(gameNumber)
  await tommyGunsPage.goto()

  await expect(adminsPage.playerLink(mayflower.playerName)).toBeVisible()
  await adminsPage.requestSubstitute(mayflower.playerName)

  await expect(gameServer).toHaveCommand(
    `say Looking for replacement for ${mayflower.playerName}...`,
    { timeout: secondsToMilliseconds(1) },
  )

  await tommyGunsPage.replacePlayer(mayflower.playerName)

  await expect(gameServer).toHaveCommand(`sm_game_player_add ${tommyGun.steamId}`)
  await expect(gameServer).toHaveCommand(`sm_game_player_del ${mayflower.steamId}`)
  await expect(gameServer).toHaveCommand(
    `say ${mayflower.playerName} has been replaced by ${tommyGun.playerName}`,
  )
})
