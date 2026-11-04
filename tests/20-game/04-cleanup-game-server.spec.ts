import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'
import { launchGame as test } from '../fixtures/launch-game'
import { expect } from '../fixtures/expect'

test.use({ waitForStage: 'started' })
// eslint-disable-next-line @typescript-eslint/no-unused-vars
test('cleanup game server @6v6 @9v9', async ({ gameServer, gameNumber }) => {
  test.setTimeout(minutesToMilliseconds(2))

  await gameServer.matchEnds()

  await expect(gameServer).toHaveCommand(/^logaddress_del/, {
    timeout: secondsToMilliseconds(40),
  })
  await expect(gameServer).toHaveCommand('sm_game_player_whitelist 0')
  await expect(gameServer).toHaveCommand('sm_game_player_delall')
  expect(gameServer.addedPlayers.length).toBe(0)
})
