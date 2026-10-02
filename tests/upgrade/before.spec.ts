// Runs against tf2pickup 4.23.13, the last release before multi-queue. Everything here must keep
// working against that version's UI.
import { launchGame as test, expect } from '../fixtures/launch-game'
import { GamePage } from '../pages/game.page'
import { saveState } from './state'
import {
  configureDefaultMedicSkill,
  configurePlayerSkillThreshold,
  configureRequirePlayerVerification,
  setConfiguration,
  setMapPool,
  updateSkill,
} from './legacy'
import {
  defaultPlayerSkill,
  mapCooldown,
  mapPool,
  readyUpTimeoutSeconds,
  playerSkillThreshold,
  skilledPlayer,
  skilledPlayerSkill,
} from './seed'

test.use({ waitForStage: 'started' })
test('seed a 4.x instance', async ({ users, desiredSlots, gameNumber, gameServer, page }) => {
  const adminPage = await users.getAdmin().page()
  await updateSkill(adminPage, users.byName(skilledPlayer).steamId, skilledPlayerSkill)
  await configureDefaultMedicSkill(adminPage, defaultPlayerSkill.medic)

  await gameServer.roundEnds('blu')
  await gameServer.matchEnds()
  const gamePage = new GamePage(page, gameNumber)
  await gamePage.goto()
  await expect(gamePage.gameEvent('Game ended')).toBeVisible()

  const [medicName] = [...desiredSlots.entries()].find(([, slot]) => slot === 'medic-1')!
  const medic = users.byName(medicName)
  const medicRow = adminPage.getByRole('row', { name: /medic/ })
  let medicElo = ''
  await expect(async () => {
    await adminPage.goto(`/players/${medic.steamId}/edit/elo`)
    await expect(medicRow.getByRole('cell').nth(2)).toHaveText('1')
    medicElo = await medicRow.getByRole('cell').nth(1).innerText()
    expect(medicElo).not.toBe('1500')
  }).toPass()

  // after the game, so they don't get in its way
  await configurePlayerSkillThreshold(adminPage, playerSkillThreshold)
  await configureRequirePlayerVerification(adminPage)
  await setMapPool(adminPage, mapPool)
  await setConfiguration(adminPage, 'queue.ready_up_timeout', readyUpTimeoutSeconds * 1000)
  await setConfiguration(adminPage, 'queue.map_cooldown', mapCooldown)

  await saveState({ gameNumber, medic: medic.steamId, medicElo })
})
