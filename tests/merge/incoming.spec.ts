// Runs on the incoming instance (9v9) before the merge.
import { launchGame as test, expect } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'
import {
  incomingDefaultSpySkill,
  incomingMapPool,
  incomingSkill,
  incomingWhitelistId,
  saveState,
  skilledPlayer,
} from './seed'

test.use({ waitForStage: 'started' })
test('seed the incoming instance', async ({ users, gameNumber, gameServer, page }) => {
  const admin = await users.getAdmin().adminPage()
  await admin.updateSkill(users.byName(skilledPlayer).steamId, incomingSkill)

  await gameServer.matchEnds()
  const gamePage = new GamePage(page, gameNumber)
  await gamePage.goto()
  await expect(gamePage.gameEvent('Game ended')).toBeVisible()

  // after the game, so its map comes from the preset pool
  await admin.setMapPool(incomingMapPool)
  await admin.configureDefaultSkill('9v9', 'spy', incomingDefaultSpySkill)
  await admin.configureWhitelistId(incomingWhitelistId)
  await saveState({ incomingGame: gameNumber })
})
