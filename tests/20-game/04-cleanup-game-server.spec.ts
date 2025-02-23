import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'
import { waitABit } from '../utils/wait-a-bit'
import { expect, launchGame } from '../fixtures/launch-game'

launchGame.use({ waitForStage: 'started' })
// eslint-disable-next-line @typescript-eslint/no-unused-vars
launchGame('cleanup game server', async ({ gameServer, gameNumber }) => {
  launchGame.setTimeout(minutesToMilliseconds(2))

  await waitABit(secondsToMilliseconds(3))
  await gameServer.matchEnds()

  await expect(gameServer).toHaveCommand(/^logaddress_del/, {
    timeout: secondsToMilliseconds(40),
  })
  await expect(gameServer).toHaveCommand('sm_game_player_whitelist 0')
  expect(gameServer.addedPlayers.length).toBe(0)
})
