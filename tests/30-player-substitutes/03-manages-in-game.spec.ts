import { secondsToMilliseconds } from 'date-fns'
import { users } from '../data'
import { expect, launchGameAndStartMatch } from '../fixtures/launch-game-and-start-match'
import { GamePage } from '../pages/game.page'
import { waitABit } from '../utils/wait-a-bit'

launchGameAndStartMatch('manages in-game', async ({ gameNumber, pages, gameServer }) => {
  const admin = users[0]
  const mayflower = users[1]
  const tommyGun = users[12]

  const adminsPage = new GamePage(pages.get(admin.steamId)!, gameNumber)
  const tommyGunsPage = new GamePage(pages.get(tommyGun.steamId)!, gameNumber)
  await tommyGunsPage.goto()

  await expect(adminsPage.playerLink(mayflower.name)).toBeVisible()
  await adminsPage.requestSubstitute(mayflower.name)

  await waitABit(secondsToMilliseconds(1))
  expect(
    gameServer.commands.some(command =>
      command.includes(`say Looking for replacement for ${mayflower.name}...`),
    ),
  ).toBe(true)

  await tommyGunsPage.replacePlayer(mayflower.name)
  await waitABit(secondsToMilliseconds(1))

  expect(
    gameServer.commands.some(command => command.includes(`sm_game_player_add ${tommyGun.steamId}`)),
  ).toBe(true)
  expect(
    gameServer.commands.some(command =>
      command.includes(`sm_game_player_del ${mayflower.steamId}`),
    ),
  ).toBe(true)
  expect(
    gameServer.commands.some(command =>
      command.includes(`say ${mayflower.name} has been replaced by ${tommyGun.name}`),
    ),
  ).toBe(true)
})
