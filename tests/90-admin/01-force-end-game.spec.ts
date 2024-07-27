import { users } from '../data'
import { expect, launchGame } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'

launchGame('force end game', async ({ pages, gameNumber }) => {
  const admin = users[0]
  const adminsPage = new GamePage(pages.get(admin.steamId)!, gameNumber)

  await adminsPage.forceEnd()
  await expect(adminsPage.gameEvent(`Game interrupted by ${admin.name}`)).toBeVisible()
})
