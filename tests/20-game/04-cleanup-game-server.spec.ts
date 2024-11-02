import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'
import { expect, launchGame } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'
import { waitABit } from '../utils/wait-a-bit'

launchGame('cleanup game server', async ({ gameNumber, page, gameServer }) => {
  launchGame.setTimeout(minutesToMilliseconds(2))

  // wait for the gameserver to be configured
  const gamePage = new GamePage(page, gameNumber)
  await gamePage.goto()
  await expect(gamePage.gameEvent('Game server assigned')).toBeVisible()
  await expect(gamePage.gameEvent('Game server initialized')).toBeVisible({ timeout: 13000 })

  await gameServer.connectAllPlayers()
  await gameServer.matchStarts()
  await waitABit(secondsToMilliseconds(10))
  await gameServer.matchEnds({ blu: 0, red: 5 })
  await waitABit(secondsToMilliseconds(40))

  expect(gameServer.commands.some(cmd => /logaddress_del/.test(cmd))).toBe(true)
  expect(gameServer.addedPlayers.length).toEqual(0)
  expect(gameServer.commands.some(cmd => cmd === 'sm_game_player_whitelist 0')).toBe(true)
})
