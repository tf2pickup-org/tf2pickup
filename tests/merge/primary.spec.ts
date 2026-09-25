// Runs on the primary instance (6v6) before the merge.
import { launchGame as test, expect } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'
import { primarySkill, saveState, skilledPlayer } from './seed'

test.use({ waitForStage: 'started' })
test('seed the primary instance', async ({ users, gameNumber, gameServer, page }) => {
  const admin = await users.getAdmin().adminPage()
  await admin.updateSkill(users.byName(skilledPlayer).steamId, primarySkill)

  await gameServer.matchEnds()
  const gamePage = new GamePage(page, gameNumber)
  await gamePage.goto()
  await expect(gamePage.gameEvent('Game ended')).toBeVisible()

  await saveState({ primaryGame: gameNumber })
})
