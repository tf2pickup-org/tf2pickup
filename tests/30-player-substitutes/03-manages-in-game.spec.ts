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

  await expect
    .poll(
      () =>
        gameServer.commands.some(command =>
          command.includes(`say Looking for replacement for ${mayflower.playerName}...`),
        ),
      { timeout: secondsToMilliseconds(1) },
    )
    .toBe(true)

  await tommyGunsPage.replacePlayer(mayflower.playerName)

  await expect
    .poll(
      () =>
        gameServer.commands.some(command =>
          command.includes(`sm_game_player_add ${tommyGun.steamId}`),
        ) &&
        gameServer.commands.some(command =>
          command.includes(`sm_game_player_del ${mayflower.steamId}`),
        ) &&
        gameServer.commands.some(command =>
          command.includes(
            `say ${mayflower.playerName} has been replaced by ${tommyGun.playerName}`,
          ),
        ),
    )
    .toBe(true)
})
