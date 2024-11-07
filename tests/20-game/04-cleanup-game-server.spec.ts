import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'
import { waitABit } from '../utils/wait-a-bit'
import { expect, launchGameAndStartMatch } from '../fixtures/launch-game-and-start-match'

launchGameAndStartMatch('cleanup game server', async ({ gameNumber, gameServer }) => {
  launchGameAndStartMatch.setTimeout(minutesToMilliseconds(2))

  await waitABit(secondsToMilliseconds(3))
  await gameServer.matchEnds()

  await expect
    .poll(
      () =>
        gameServer.commands.some(cmd => /logaddress_del/.test(cmd)) &&
        gameServer.addedPlayers.length === 0 &&
        gameServer.commands.some(cmd => cmd === 'sm_game_player_whitelist 0'),
      {
        timeout: secondsToMilliseconds(40),
      },
    )
    .toBe(true)
})
