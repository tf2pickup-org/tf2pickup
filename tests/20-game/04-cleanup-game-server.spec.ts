import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'
import { waitABit } from '../utils/wait-a-bit'
import { expect, launchGameAndStartMatch } from '../fixtures/launch-game-and-start-match'

launchGameAndStartMatch('cleanup game server', async ({ gameNumber, gameServer }) => {
  launchGameAndStartMatch.setTimeout(minutesToMilliseconds(2))

  await waitABit(secondsToMilliseconds(3))
  await gameServer.matchEnds()

  await expect(gameServer).toHaveCommand(/^logaddress_del/, {
    timeout: secondsToMilliseconds(40),
  })
  await expect(gameServer).toHaveCommand('sm_game_player_whitelist 0')
  expect(gameServer.addedPlayers.length).toBe(0)
})
