import { expect } from '@playwright/test'
import { launchGame } from '../fixtures/launch-game'
import { users } from '../data'
import { QueuePage } from '../pages/queue.page'
import { waitABit } from '../utils/wait-a-bit'
import { secondsToMilliseconds } from 'date-fns'
import { GamePage } from '../pages/game.page'

launchGame(
  'free players when the game ends',
  async ({ steamIds, gameNumber, pages, gameServer }) => {
    const queueUsers = steamIds.slice(0, 12)

    const gamePage = new GamePage(pages.get(users[0].steamId)!, gameNumber)
    expect(pages.get(users[0].steamId)!.url()).toMatch(gamePage.url())

    await expect(gamePage.gameEvent('Game server assigned')).toBeVisible()
    await expect(gamePage.gameEvent('Game server initialized')).toBeVisible({ timeout: 13000 })

    await Promise.all(
      queueUsers.map(async steamId => {
        const queuePage = new QueuePage(pages.get(steamId)!)
        await queuePage.goto()
        await expect(queuePage.goBackToGameLink()).toBeVisible()
      }),
    )

    await gameServer.connectAllPlayers()
    gameServer.log('World triggered "Round_Start"')
    await waitABit(secondsToMilliseconds(10))
    gameServer.log('World triggered "Game_Over" reason "Reached Win Limit"')
    gameServer.log('Team "Red" final score "5" with "6" players')
    gameServer.log('Team "Blue" final score "0" with "6" players')

    await Promise.all(
      queueUsers.map(async steamId => {
        const queuePage = new QueuePage(pages.get(steamId)!)
        await queuePage.goto()
        await expect(queuePage.goBackToGameLink()).not.toBeVisible()
      }),
    )
  },
)
