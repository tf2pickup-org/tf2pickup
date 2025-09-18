import { secondsToMilliseconds } from 'date-fns'
import { expect, launchGame } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'
import { delay } from 'es-toolkit'

launchGame.use({ waitForStage: 'started' })
launchGame('report rounds', async ({ gameNumber, page, gameServer }) => {
  // wait for the gameserver to be configured
  const gamePage = new GamePage(page, gameNumber)
  await gamePage.goto()

  await expect(gamePage.page.getByLabel('blu team score')).toHaveText('0')
  await expect(gamePage.page.getByLabel('red team score')).toHaveText('0')

  await gameServer.roundEnds('blu')
  await expect(gamePage.page.getByText('Round ended')).toBeVisible()
  await expect(gamePage.page.getByLabel('blu team score')).toHaveText('1')
  await expect(gamePage.page.getByLabel('red team score')).toHaveText('0')

  await delay(secondsToMilliseconds(1))

  await gameServer.roundEnds('red')
  await expect(gamePage.page.getByText('Round ended')).toHaveCount(2)
  await expect(gamePage.page.getByLabel('blu team score')).toHaveText('1')
  await expect(gamePage.page.getByLabel('red team score')).toHaveText('1')

  await delay(secondsToMilliseconds(1))
  // await gameServer.matchEnds()
})
