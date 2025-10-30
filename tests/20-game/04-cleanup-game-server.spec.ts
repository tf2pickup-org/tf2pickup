import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'
import { expect, launchGame } from '../fixtures/launch-game'
import { delay } from 'es-toolkit'

launchGame.use({ waitForStage: 'started' })
// eslint-disable-next-line @typescript-eslint/no-unused-vars
launchGame('cleanup game server', async ({ gameServer, gameNumber }) => {
  launchGame.setTimeout(minutesToMilliseconds(2))

  await delay(secondsToMilliseconds(3))
  await gameServer.matchEnds()

  await expect(gameServer).toHaveCommand(/^logaddress_del/, {
    timeout: secondsToMilliseconds(40),
  })
  await expect(gameServer).toHaveCommand('sm_game_player_whitelist 0')
  await expect(gameServer).toHaveCommand('sm_game_player_delall')
  expect(gameServer.addedPlayers.length).toBe(0)
})
