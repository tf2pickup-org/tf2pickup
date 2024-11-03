import { secondsToMilliseconds } from 'date-fns'
import { expect, launchGame } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'
import { waitABit } from '../utils/wait-a-bit'

launchGame('report rounds', async ({ gameNumber, page, gameServer }) => {
  // wait for the gameserver to be configured
  const gamePage = new GamePage(page, gameNumber)
  await gamePage.goto()
  await expect(gamePage.gameEvent('Game server assigned')).toBeVisible()
  await expect(gamePage.gameEvent('Game server initialized')).toBeVisible({ timeout: 13000 })

  await gameServer.connectAllPlayers()
  await gameServer.matchStarts()
  await waitABit(secondsToMilliseconds(1))

  await gameServer.roundEnds('blu')
  await expect(gamePage.page.getByText('Round ended')).toBeVisible()
  await waitABit(secondsToMilliseconds(1))
  await gameServer.roundEnds('red')
  await expect(gamePage.page.getByText('Round ended')).toHaveCount(2)
  await waitABit(secondsToMilliseconds(1))
  await gameServer.matchEnds()
})
